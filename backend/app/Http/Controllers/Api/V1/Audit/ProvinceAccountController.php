<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Http\Requests\Audit\ProvinceAccountIndexRequest;
use App\Http\Requests\Audit\ProvinceAccountUpdateRequest;
use App\Services\Audit\ProvinceAccountService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 报名账号查询/修改/删除/重置密码
 */
class ProvinceAccountController extends Controller
{
    public function __construct(private readonly ProvinceAccountService $service) {}

    public function index(ProvinceAccountIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request));
    }

    public function update(int $id, ProvinceAccountUpdateRequest $request): JsonResponse
    {
        $this->service->update($id, $request->validated());
        return Result::success('修改成功');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->service->destroy($id, request()->user());
        return Result::success('删除成功');
    }

    public function resetPassword(int $id): JsonResponse
    {
        $newPassword = $this->service->resetPassword($id);
        return Result::success('密码已重置', ['new_password' => $newPassword]);
    }
}
