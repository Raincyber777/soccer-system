<?php

namespace App\Services\Audit;

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\OperationLog;
use Illuminate\Http\Request;

/**
 * 省级审核端 — 操作日志业务
 */
class ProvinceLogService
{
    public function paginate(Request $request): array
    {
        $query = OperationLog::query()->with(['user:id,username,real_name']);

        if ($kw = $request->input('keyword')) {
            $query->where(function ($q) use ($kw) {
                $q->where('action', 'like', "%{$kw}%")
                  ->orWhere('module', 'like', "%{$kw}%")
                  ->orWhere('trace_id', 'like', "%{$kw}%");
            });
        }
        if ($request->filled('module')) {
            $query->where('module', $request->input('module'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [$request->input('start_date'), $request->input('end_date') . ' 23:59:59']);
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

    public function detail(int $id): array
    {
        $log = OperationLog::with(['user:id,username,real_name'])->find($id);
        if (! $log) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '日志不存在');
        }
        return $log->toArray();
    }
}
