<?php

use App\Http\Controllers\Api\V1\Common\AuthController;
use App\Http\Controllers\Api\V1\Common\UploadController;
use Illuminate\Support\Facades\Route;

/**
 * 公共接口（融合组维护）
 */
Route::prefix('v1')->group(function () {

    // ── 登录（不需要鉴权）──
    Route::post('auth/login', [AuthController::class, 'login']);

    // ── 以下需登录 ──
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me',      [AuthController::class, 'me']);

        // 统一上传入口（规范 5 节：POST /api/v1/upload）
        Route::post('upload', [UploadController::class, 'store']);
    });

    // 字典 & 行政区划（公开可读）
    Route::get('dicts/{type}', function (string $type) {
        return \App\Models\Dict::where('type', $type)
            ->where('status', 1)
            ->orderBy('sort')
            ->get(['code', 'label'])
            ->toArray();
    });

    Route::get('regions', function () {
        return \App\Models\Region::where('parent_id', 0)
            ->with(['children' => fn ($q) => $q->orderBy('sort')])
            ->orderBy('sort')
            ->get()
            ->toArray();
    });
});
