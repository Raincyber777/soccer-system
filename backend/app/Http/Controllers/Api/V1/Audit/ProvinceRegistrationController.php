<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Http\Requests\Audit\ProvinceRegistrationIndexRequest;
use App\Http\Requests\Audit\ProvinceRegistrationRejectRequest;
use App\Services\Audit\ProvinceRegistrationService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 球队报名查询/搜索/驳回/查看扫描件/下载
 */
class ProvinceRegistrationController extends Controller
{
    public function __construct(private readonly ProvinceRegistrationService $service) {}

    public function index(ProvinceRegistrationIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request->validated()));
    }

    public function show(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->detail($id));
    }

    public function approve(int $id): JsonResponse
    {
        $this->service->approve($id, request()->user());
        return Result::success('省级审核通过');
    }

    public function reject(int $id, ProvinceRegistrationRejectRequest $request): JsonResponse
    {
        $this->service->reject($id, $request->validated(), request()->user());
        return Result::success('已驳回');
    }

    public function seal(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->sealFiles($id));
    }

    public function download(int $id, Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        return $this->service->download($id, $request->user());
    }
}
