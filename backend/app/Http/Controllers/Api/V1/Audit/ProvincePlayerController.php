<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Http\Requests\Audit\ProvincePlayerIndexRequest;
use App\Http\Requests\Audit\ProvincePlayerUpdateRequest;
use App\Services\Audit\ProvincePlayerService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 球员身份信息搜索/修改/上传头像
 */
class ProvincePlayerController extends Controller
{
    public function __construct(private readonly ProvincePlayerService $service) {}

    public function index(ProvincePlayerIndexRequest $request): JsonResponse
    {
        return Result::success('查询成功', $this->service->paginate($request));
    }

    public function show(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->detail($id));
    }

    public function update(int $id, ProvincePlayerUpdateRequest $request): JsonResponse
    {
        $this->service->update($id, $request->validated());
        return Result::success('修改成功');
    }

    public function uploadAvatar(int $id, Request $request): JsonResponse
    {
        $request->validate(['avatar' => ['required', 'image', 'max:5120']]);
        $url = $this->service->uploadAvatar($id, $request->file('avatar'));
        return Result::success('上传成功', ['photo_url' => $url]);
    }
}
