<?php

namespace App\Services\Audit;

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\RegistrationCoach;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * 省级审核端 — 教练员身份业务
 */
class ProvinceCoachService
{
    public function paginate(Request $request): array
    {
        $query = RegistrationCoach::query()
            ->with(['registration:id,unit_name,event_id', 'registration.event:id,name'])
            ->whereHas('registration', fn ($q) => $q->where('audit_status', '>=', 1));

        if ($kw = $request->input('keyword')) {
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'like', "%{$kw}%")
                  ->orWhere('certificate_no', 'like', "%{$kw}%");
            });
        }

        $pageSize = $request->input('pageSize', 20);
        $pageNum  = $request->input('pageNum', 1);
        $total    = $query->count();
        $list     = $query->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        return ['list' => $list, 'total' => $total, 'pageNum' => $pageNum, 'pageSize' => $pageSize];
    }

    public function update(int $id, array $data): void
    {
        $coach = RegistrationCoach::find($id);
        if (! $coach) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '教练员不存在');
        }
        $coach->update($data);

        Log::channel('business')->info('省级修改教练员信息', [
            'trace_id'   => request()->attributes->get('trace_id'),
            'coach_id'   => $id,
            'updater_id' => request()->user()->id,
        ]);
    }
}
