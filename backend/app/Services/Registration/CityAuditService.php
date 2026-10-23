<?php

namespace App\Services\Registration;

use App\Enums\AuditLevelEnum;
use App\Enums\AuditStatusEnum;
use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\AuditRecord;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 市州端 — 学校报名审核业务
 */
class CityAuditService
{
    /**
     * 分页查询（自动按市州当前登录用户所属 region_id 过滤）
     */
    public function paginate(array $params, mixed $user): array
    {
        $query = Registration::query()
            ->with(['event:id,name,year', 'region:id,name'])
            ->where('region_id', $user->region_id);

        // 按市州隔离：只看本市州数据

        // 注意：audit_status=0（待审核）不能用作假值判断，统一用 !== '' 判定
        if (($params['event_id'] ?? '') !== '') {
            $query->where('event_id', $params['event_id']);
        }
        if (($params['audit_status'] ?? '') !== '') {
            $query->where('audit_status', $params['audit_status']);
        }
        if (($params['category'] ?? '') !== '') {
            $query->where('category', $params['category']);
        }
        if (($params['type'] ?? '') !== '') {
            $query->where('type', $params['type']);
        }
        if (($params['keyword'] ?? '') !== '') {
            $kw = $params['keyword'];
            $query->where(function ($q) use ($kw) {
                $q->where('unit_name', 'like', "%{$kw}%")
                  ->orWhere('contact_name', 'like', "%{$kw}%")
                  ->orWhere('contact_phone', 'like', "%{$kw}%");
            });
        }

        $pageSize = $params['pageSize'] ?? 10;
        $pageNum  = $params['pageNum'] ?? 1;

        $total = $query->count();
        $list  = $query->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get([
                'id', 'event_id', 'unit_name', 'type', 'category',
                'player_count', 'coach_count', 'audit_status',
                'contact_name', 'contact_phone', 'region_id',
                'created_at', 'city_audited_at', 'province_audited_at',
            ]);

        return [
            'list'     => $list,
            'total'    => $total,
            'pageNum'  => $pageNum,
            'pageSize' => $pageSize,
        ];
    }

    /**
     * 详情：含球员/教练/资料/审核记录
     */
    public function detail(int $id, mixed $user): array
    {
        $registration = Registration::query()
            ->with([
                'event:id,name,year,category',
                'region:id,name',
                'players',
                'coaches',
                'files.file:id,original_name,url,storage_path',
                'auditRecords' => fn ($q) => $q->orderByDesc('id'),
            ])
            ->where('region_id', $user->region_id)
            ->find($id);

        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        return $registration->toArray();
    }

    /**
     * 市州审核通过
     */
    public function approve(int $id, mixed $user): void
    {
        DB::transaction(function () use ($id, $user) {
            $registration = Registration::where('region_id', $user->region_id)
                ->lockForUpdate()
                ->find($id);

            if (! $registration) {
                throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
            }

            if ($registration->audit_status !== AuditStatusEnum::PENDING->value) {
                throw new BusinessException(ResponseCode::BUSINESS_ERROR, '当前状态不可审核');
            }

            $registration->update([
                'audit_status'   => AuditStatusEnum::CITY_APPROVED->value,
                'city_audited_by' => $user->id,
                'city_audited_at' => now(),
            ]);

            AuditRecord::create([
                'auditable_type' => Registration::class,
                'auditable_id'   => $registration->id,
                'registration_id' => $registration->id,
                'from_status'    => AuditStatusEnum::PENDING->value,
                'to_status'      => AuditStatusEnum::CITY_APPROVED->value,
                'action'         => 'approve',
                'auditor_id'     => $user->id,
                'auditor_name'   => $user->real_name ?: $user->username,
                'audit_level'    => AuditLevelEnum::CITY->value,
            ]);

            Log::channel('business')->info('市州审核通过', [
                'trace_id'        => request()->attributes->get('trace_id'),
                'registration_id' => $registration->id,
                'auditor_id'      => $user->id,
                'region_id'       => $user->region_id,
            ]);
        });
    }

    /**
     * 市州审核驳回
     */
    public function reject(int $id, array $data, mixed $user): void
    {
        DB::transaction(function () use ($id, $data, $user) {
            $registration = Registration::where('region_id', $user->region_id)
                ->lockForUpdate()
                ->find($id);

            if (! $registration) {
                throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
            }

            if ($registration->audit_status !== AuditStatusEnum::PENDING->value) {
                throw new BusinessException(ResponseCode::BUSINESS_ERROR, '当前状态不可驳回');
            }

            $registration->update([
                'audit_status'   => AuditStatusEnum::REJECTED->value,
                'reject_reason'  => $data['reject_reason'],
                'city_audited_by' => $user->id,
                'city_audited_at' => now(),
            ]);

            AuditRecord::create([
                'auditable_type' => Registration::class,
                'auditable_id'   => $registration->id,
                'registration_id' => $registration->id,
                'from_status'    => AuditStatusEnum::PENDING->value,
                'to_status'      => AuditStatusEnum::REJECTED->value,
                'action'         => 'reject',
                'reason'         => $data['reject_reason'],
                'auditor_id'     => $user->id,
                'auditor_name'   => $user->real_name ?: $user->username,
                'audit_level'    => AuditLevelEnum::CITY->value,
            ]);

            Log::channel('business')->info('市州审核驳回', [
                'trace_id'        => request()->attributes->get('trace_id'),
                'registration_id' => $registration->id,
                'auditor_id'      => $user->id,
                'reason'          => $data['reject_reason'],
            ]);
        });
    }
}
