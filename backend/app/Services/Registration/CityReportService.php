<?php

namespace App\Services\Registration;

use App\Enums\AuditStatusEnum;
use App\Enums\RegistrationTypeEnum;
use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\Registration;
use App\Models\RegistrationCoach;
use App\Models\RegistrationPlayer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 市州端 — 市州报送业务
 */
class CityReportService
{
    public function create(array $data, mixed $user): int
    {
        return DB::transaction(function () use ($data, $user) {
            // 检查是否已报送同一赛事
            $exists = Registration::where('event_id', $data['event_id'])
                ->where('region_id', $user->region_id)
                ->where('type', RegistrationTypeEnum::CITY->value)
                ->first();

            if ($exists) {
                throw new BusinessException(ResponseCode::DATA_EXISTS, '本市已报送该赛事');
            }

            $registration = Registration::create([
                'event_id'       => $data['event_id'],
                'region_id'      => $user->region_id,
                'type'           => RegistrationTypeEnum::CITY->value,
                'category'       => $data['category'],
                'unit_name'      => $data['unit_name'],
                'contact_name'   => $data['contact_name'] ?? null,
                'contact_phone'  => $data['contact_phone'] ?? null,
                'player_count'   => count($data['players'] ?? []),
                'coach_count'    => count($data['coaches'] ?? []),
                'audit_status'   => AuditStatusEnum::CITY_APPROVED->value, // 市州报送默认市级已过，待省级
                'city_audited_by' => $user->id,
                'city_audited_at' => now(),
                'created_by'     => $user->id,
            ]);

            // 球员批量写入
            if (! empty($data['players'])) {
                foreach ($data['players'] as $p) {
                    RegistrationPlayer::create([
                        'registration_id' => $registration->id,
                        'name'            => $p['name'],
                        'id_card'         => $p['id_card'],
                        'jersey_no'       => $p['jersey_no'] ?? null,
                        'position'        => $p['position'] ?? null,
                    ]);
                }
            }

            // 教练批量写入
            if (! empty($data['coaches'])) {
                foreach ($data['coaches'] as $c) {
                    RegistrationCoach::create([
                        'registration_id' => $registration->id,
                        'name'            => $c['name'],
                        'id_card'         => $c['id_card'] ?? null,
                        'role'            => $c['role'] ?? null,
                    ]);
                }
            }

            Log::channel('business')->info('市州报送成功', [
                'trace_id'        => request()->attributes->get('trace_id'),
                'registration_id' => $registration->id,
                'event_id'        => $data['event_id'],
                'region_id'       => $user->region_id,
                'player_count'    => count($data['players'] ?? []),
                'coach_count'     => count($data['coaches'] ?? []),
            ]);

            return $registration->id;
        });
    }

    /**
     * 本市报送记录
     */
    public function mine(mixed $user): array
    {
        return Registration::query()
            ->with(['event:id,name,year,category'])
            ->where('type', RegistrationTypeEnum::CITY->value)
            ->where('region_id', $user->region_id)
            ->orderByDesc('id')
            ->get([
                'id', 'event_id', 'unit_name', 'category',
                'player_count', 'coach_count', 'audit_status',
                'created_at', 'city_audited_at', 'province_audited_at',
            ])
            ->toArray();
    }

    /**
     * 全市汇总：按状态 + 组别 + 类型统计
     */
    public function summary(mixed $user): array
    {
        $regionId = $user->region_id;

        $base = Registration::where('region_id', $regionId);

        // 按审核状态
        $statusStats = $base->clone()
            ->selectRaw('audit_status, COUNT(*) as cnt, SUM(player_count) as players, SUM(coach_count) as coaches')
            ->groupBy('audit_status')
            ->get();

        // 按组别
        $categoryStats = $base->clone()
            ->selectRaw('category, COUNT(*) as cnt')
            ->groupBy('category')
            ->pluck('cnt', 'category');

        // 按类型（球队端/高校端/市州端报送）
        $typeStats = $base->clone()
            ->selectRaw('type, COUNT(*) as cnt')
            ->groupBy('type')
            ->pluck('cnt', 'type');

        $total = $base->count();

        return [
            'total'         => $total,
            'status_stats'  => $statusStats->toArray(),
            'category_stats' => $categoryStats->toArray(),
            'type_stats'    => $typeStats->toArray(),
        ];
    }
}
