<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Http\Requests\Audit\ProvinceCoachIndexRequest;
use App\Http\Requests\Audit\ProvinceCoachUpdateRequest;
use App\Services\Audit\ProvinceCoachService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 教练员身份信息搜索/修改
 */
class ProvinceCoachController extends Controller
{
    public function __construct(private readonly ProvinceCoachService $service) {}

    public function index(ProvinceCoachIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request));
    }

    public function update(int $id, ProvinceCoachUpdateRequest $request): JsonResponse
    {
        $this->service->update($id, $request->validated());
        return Result::success('修改成功');
    }
}
