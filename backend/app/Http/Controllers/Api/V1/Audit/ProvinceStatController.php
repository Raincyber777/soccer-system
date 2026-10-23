<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Services\Audit\ProvinceStatService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 市州/高校报名统计
 */
class ProvinceStatController extends Controller
{
    public function __construct(private readonly ProvinceStatService $service) {}

    public function city(Request $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->byCity($request));
    }

    public function college(Request $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->byCollege($request));
    }

    public function overview(Request $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->overview($request));
    }
}
