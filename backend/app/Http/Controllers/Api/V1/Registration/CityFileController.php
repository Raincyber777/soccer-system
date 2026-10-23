<?php

namespace App\Http\Controllers\Api\V1\Registration;

use App\Services\Registration\CityFileService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;

/**
 * 市州端 — 报名资料管理
 */
class CityFileController extends Controller
{
    public function __construct(private readonly CityFileService $service) {}

    public function index(int $id): JsonResponse
    {
        return Result::success('查询成功', $this->service->index($id, request()->user()));
    }

    public function store(int $id, Request $request): JsonResponse
    {
        $request->validate([
            'file_type' => ['required', 'string', 'max:32'],
            'files'     => ['required', 'array'],
            'files.*'   => ['required', 'file'],
        ]);
        $this->service->upload($id, $request, $request->user());
        return Result::success('上传成功');
    }

    public function destroy(int $fileId): JsonResponse
    {
        $this->service->destroy($fileId, request()->user());
        return Result::success('删除成功');
    }
}
