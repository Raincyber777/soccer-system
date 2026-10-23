<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Http\Requests\Audit\ProvinceLogIndexRequest;
use App\Services\Audit\ProvinceLogService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 报名日志管理
 */
class ProvinceLogController extends Controller
{
    public function __construct(private readonly ProvinceLogService $service) {}

    public function index(ProvinceLogIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request));
    }

    public function show(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->detail($id));
    }
}
