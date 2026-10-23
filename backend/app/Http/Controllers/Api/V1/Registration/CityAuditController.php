<?php

namespace App\Http\Controllers\Api\V1\Registration;

use App\Http\Requests\Registration\CityAuditIndexRequest;
use App\Http\Requests\Registration\CityAuditRejectRequest;
use App\Services\Registration\CityAuditService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

/**
 * 市州端 — 学校报名审核/查询/驳回
 * Controller 只做参数接收 → 调 Service → Result 返回
 */
class CityAuditController extends Controller
{
    public function __construct(private readonly CityAuditService $service) {}

    public function index(CityAuditIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request->validated(), $request->user()));
    }

    public function show(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->detail($id, request()->user()));
    }

    public function approve(int $id): JsonResponse
    {
        $this->service->approve($id, request()->user());
        return Result::success('审核通过');
    }

    public function reject(int $id, CityAuditRejectRequest $request): JsonResponse
    {
        $this->service->reject($id, $request->validated(), request()->user());
        return Result::success('已驳回');
    }
}
