<?php

namespace App\Services\Audit;

use App\Enums\RegistrationTypeEnum;
use App\Models\Registration;
use Illuminate\Http\Request;

/**
 * 省级审核端 — 统计业务
 */
class ProvinceStatService
{
    /**
     * 按市州统计（region_id 二级分组）
     */
    public function byCity(Request $request): array
    {
        $base = Registration::query();
        if ($eventId = $request->input('event_id')) {
            $base->where('event_id', $eventId);
        }

        // 取所有市州
        $cities = \App\Models\Region::where('level', 2)->orderBy('sort')->get();

        $rows = [];
        foreach ($cities as $city) {
            $stats = Registration::where('region_id', $city->id)
                ->when($eventId ?? null, fn ($q) => $q->where('event_id', $eventId))
                ->selectRaw(
                    'COUNT(*) as total, ' .
                    'SUM(CASE WHEN audit_status = 0 THEN 1 ELSE 0 END) as pending, ' .
                    'SUM(CASE WHEN audit_status = 1 THEN 1 ELSE 0 END) as city_approved, ' .
                    'SUM(CASE WHEN audit_status = 2 THEN 1 ELSE 0 END) as province_approved, ' .
                    'SUM(CASE WHEN audit_status = 3 THEN 1 ELSE 0 END) as rejected, ' .
                    'SUM(player_count) as players, ' .
                    'SUM(coach_count) as coaches'
                )
                ->first();

            $rows[] = [
                'region_id'  => $city->id,
                'region_name' => $city->name,
                ... $stats->toArray(),
            ];
        }

        return $rows;
    }

    /**
     * 按高校统计（与按市州统计保持同一结构：聚合计数）
     * 返回字段：unit_name, region_id, region_name, total,
     *          pending, city_approved, province_approved, rejected, players, coaches
     */
    public function byCollege(Request $request): array
    {
        $query = Registration::query()
            ->where('type', RegistrationTypeEnum::COLLEGE->value)
            ->when($request->filled('event_id'), fn ($q) => $q->where('event_id', $request->input('event_id')));

        $rows = $query
            ->selectRaw(
                'unit_name, region_id, ' .
                'COUNT(*) as total, ' .
                'SUM(CASE WHEN audit_status = 0 THEN 1 ELSE 0 END) as pending, ' .
                'SUM(CASE WHEN audit_status = 1 THEN 1 ELSE 0 END) as city_approved, ' .
                'SUM(CASE WHEN audit_status = 2 THEN 1 ELSE 0 END) as province_approved, ' .
                'SUM(CASE WHEN audit_status = 3 THEN 1 ELSE 0 END) as rejected, ' .
                'SUM(player_count) as players, ' .
                'SUM(coach_count) as coaches'
            )
            ->groupBy('unit_name', 'region_id')
            ->orderByDesc('total')
            ->get();

        $regionNames = \App\Models\Region::whereIn('id', $rows->pluck('region_id')->filter()->unique())
            ->pluck('name', 'id');

        return $rows->map(fn ($r) => [
            'unit_name'   => $r->unit_name,
            'region_id'   => $r->region_id,
            'region_name' => $regionNames[$r->region_id] ?? null,
            'total'       => (int) $r->total,
            'pending'     => (int) $r->pending,
            'city_approved'      => (int) $r->city_approved,
            'province_approved'  => (int) $r->province_approved,
            'rejected'    => (int) $r->rejected,
            'players'     => (int) $r->players,
            'coaches'     => (int) $r->coaches,
        ])->all();
    }

    /**
     * 总览：全局统计 + 按状态 + 按组别 + 按类型
     */
    public function overview(Request $request): array
    {
        $base = Registration::query();
        if ($eventId = $request->input('event_id')) {
            $base->where('event_id', $eventId);
        }

        $total = (clone $base)->count();

        $statusStats = (clone $base)
            ->selectRaw('audit_status, COUNT(*) as cnt')
            ->groupBy('audit_status')
            ->pluck('cnt', 'audit_status')
            ->toArray();

        $categoryStats = (clone $base)
            ->selectRaw('category, COUNT(*) as cnt')
            ->groupBy('category')
            ->pluck('cnt', 'category')
            ->toArray();

        $typeStats = (clone $base)
            ->selectRaw('type, COUNT(*) as cnt')
            ->groupBy('type')
            ->pluck('cnt', 'type')
            ->toArray();

        // 近 7 天每日新增
        $daily = (clone $base)
            ->selectRaw("DATE(created_at) as day, COUNT(*) as cnt")
            ->where('created_at', '>=', now()->subDays(7)->startOfDay())
            ->groupBy('day')
            ->pluck('cnt', 'day')
            ->toArray();

        return [
            'total'          => $total,
            'players_total'  => (clone $base)->sum('player_count'),
            'coaches_total'  => (clone $base)->sum('coach_count'),
            'status_stats'   => $statusStats,
            'category_stats' => $categoryStats,
            'type_stats'     => $typeStats,
            'daily_trend'    => $daily,
        ];
    }
}
