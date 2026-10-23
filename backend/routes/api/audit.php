<?php

use App\Http\Controllers\Api\V1\Audit\ProvinceRegistrationController;
use App\Http\Controllers\Api\V1\Audit\ProvincePlayerController;
use App\Http\Controllers\Api\V1\Audit\ProvinceCoachController;
use App\Http\Controllers\Api\V1\Audit\ProvinceStatController;
use App\Http\Controllers\Api\V1\Audit\ProvinceAccountController;
use App\Http\Controllers\Api\V1\Audit\ProvinceLogController;
use App\Http\Controllers\Api\V1\Audit\ProvinceExportController;
use Illuminate\Support\Facades\Route;

/**
 * 省级审核端路由
 * role=1 省级
 */
Route::prefix('v1')->middleware('auth:sanctum', 'role:1')->group(function () {

    // ── 球队报名查询 / 搜索 / 驳回 / 查看扫描件 / 下载 ──
    Route::get('province/registrations',                 [ProvinceRegistrationController::class, 'index']);
    Route::get('province/registrations/{id}',            [ProvinceRegistrationController::class, 'show']);
    Route::post('province/registrations/{id}/approve',   [ProvinceRegistrationController::class, 'approve']);
    Route::post('province/registrations/{id}/reject',    [ProvinceRegistrationController::class, 'reject']);
    Route::get('province/registrations/{id}/seal',       [ProvinceRegistrationController::class, 'seal']);        // 查看盖章扫描件
    Route::get('province/registrations/{id}/download',   [ProvinceRegistrationController::class, 'download']);    // 下载报名表 Word + 学籍材料

    // ── 球员身份信息搜索 / 修改 / 上传头像 ──
    Route::get('province/players',                       [ProvincePlayerController::class, 'index']);
    Route::get('province/players/{id}',                  [ProvincePlayerController::class, 'show']);
    Route::put('province/players/{id}',                  [ProvincePlayerController::class, 'update']);
    Route::post('province/players/{id}/avatar',          [ProvincePlayerController::class, 'uploadAvatar']);

    // ── 教练员身份信息搜索 / 修改 ──
    Route::get('province/coaches',                       [ProvinceCoachController::class, 'index']);
    Route::put('province/coaches/{id}',                  [ProvinceCoachController::class, 'update']);

    // ── 市州/高校报名统计 ──
    Route::get('province/stats/city',                    [ProvinceStatController::class, 'city']);               // 按市州统计
    Route::get('province/stats/college',                 [ProvinceStatController::class, 'college']);            // 按高校统计
    Route::get('province/stats/overview',                [ProvinceStatController::class, 'overview']);           // 总览

    // ── 报名情况导出 ──
    Route::get('province/export/registrations',          [ProvinceExportController::class, 'registrations']);    // 报名列表 Excel
    Route::get('province/export/approved-word',          [ProvinceExportController::class, 'approvedWord']);     // 通过名单 Word

    // ── 报名账号查询 / 修改 / 删除 ──
    Route::get('province/accounts',                      [ProvinceAccountController::class, 'index']);
    Route::put('province/accounts/{id}',                 [ProvinceAccountController::class, 'update']);
    Route::delete('province/accounts/{id}',              [ProvinceAccountController::class, 'destroy']);
    Route::post('province/accounts/{id}/reset-password', [ProvinceAccountController::class, 'resetPassword']);

    // ── 报名日志管理 ──
    Route::get('province/logs',                          [ProvinceLogController::class, 'index']);
    Route::get('province/logs/{id}',                     [ProvinceLogController::class, 'show']);
});
