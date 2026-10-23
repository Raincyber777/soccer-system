<?php

namespace App\Http\Controllers\Api\V1\Registration;

use App\Http\Requests\Registration\CityReportStoreRequest;
use App\Services\Registration\CityReportService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

/**
 * 市州端 — 市州报名报送与全市汇总
 */
class CityReportController extends Controller
{
    public function __construct(private readonly CityReportService $service) {}

    public function store(CityReportStoreRequest $request): JsonResponse
    {
        $data = $this->service->create($request->validated(), $request->user());
        return Result::success('报送成功', ['registration_id' => $data]);
    }

    public function mine(): JsonResponse
    {
        return Result::success('查询成功', $this->service->mine(request()->user()));
    }

    public function summary(): JsonResponse
    {
        return Result::success('查询成功', $this->service->summary(request()->user()));
    }
}
