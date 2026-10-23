<?php

namespace App\Services\Audit;

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\OperationLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * 省级审核端 — 账号管理业务
 */
class ProvinceAccountService
{
    public function paginate(Request $request): array
    {
        $query = User::query()->with('region:id,name');

        if ($kw = $request->input('keyword')) {
            $query->where(function ($q) use ($kw) {
                $q->where('username', 'like', "%{$kw}%")
                  ->orWhere('real_name', 'like', "%{$kw}%")
                  ->orWhere('phone', 'like', "%{$kw}%");
            });
        }
        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $pageSize = $request->input('pageSize', 15);
        $pageNum  = $request->input('pageNum', 1);
        $total    = $query->count();
        $list     = $query->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get([
                'id', 'username', 'real_name', 'phone', 'role',
                'org_id', 'region_id', 'status', 'last_login_at',
                'created_at', 'remark',
            ]);

        return ['list' => $list, 'total' => $total, 'pageNum' => $pageNum, 'pageSize' => $pageSize];
    }

    public function update(int $id, array $data): void
    {
        $user = User::find($id);
        if (! $user) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '账号不存在');
        }
        $user->update($data);

        $this->writeLog('account', 'update', $id, ['fields' => array_keys($data)]);
    }

    public function destroy(int $id, mixed $operator): void
    {
        $user = User::find($id);
        if (! $user) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '账号不存在');
        }
        if ($user->id === $operator->id) {
            throw new BusinessException(ResponseCode::BUSINESS_ERROR, '不能删除自己');
        }
        $user->delete();

        $this->writeLog('account', 'delete', $id);
    }

    public function resetPassword(int $id): string
    {
        $user = User::find($id);
        if (! $user) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '账号不存在');
        }

        $newPassword = 'Sport@' . date('md') . substr(md5((string) $id), 0, 4);
        $user->update(['password' => Hash::make($newPassword)]);

        $this->writeLog('account', 'reset_password', $id);
        Log::channel('business')->info('省级重置账号密码', [
            'trace_id'      => request()->attributes->get('trace_id'),
            'account_id'    => $id,
            'operator_id'   => request()->user()->id,
        ]);

        return $newPassword;
    }

    protected function writeLog(string $module, string $action, int $targetId, array $detail = []): void
    {
        OperationLog::create([
            'user_id'     => request()->user()->id,
            'module'      => $module,
            'action'      => $action,
            'target_type' => User::class,
            'target_id'   => $targetId,
            'ip'          => request()->ip(),
            'trace_id'    => request()->attributes->get('trace_id', ''),
            'detail'      => $detail,
        ]);
    }
}
