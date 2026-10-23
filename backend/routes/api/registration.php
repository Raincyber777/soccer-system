<?php

use App\Http\Controllers\Api\V1\Registration\CityAuditController;
use App\Http\Controllers\Api\V1\Registration\CityReportController;
use App\Http\Controllers\Api\V1\Registration\CityFileController;
use Illuminate\Support\Facades\Route;

/**
 * 报名域路由 — 市州端
 * role=2 市州
 */
Route::prefix('v1')->middleware('auth:sanctum', 'role:2')->group(function () {

    // ── 学校报名审核 / 查询 / 驳回 ──
    Route::get('city/registrations',         [CityAuditController::class, 'index']);       // 分页列表（待审/已审/驳回）
    Route::get('city/registrations/{id}',   [CityAuditController::class, 'show']);        // 详情（含球员/教练/资料）
    Route::post('city/registrations/{id}/approve', [CityAuditController::class, 'approve']); // 通过
    Route::post('city/registrations/{id}/reject',  [CityAuditController::class, 'reject']);  // 驳回（填原因）

    // ── 市州报送与全市汇总 ──
    Route::post('city/registrations',                     [CityReportController::class, 'store']);          // 市州报送
    Route::get('city/registrations/my',                   [CityReportController::class, 'mine']);           // 本市报送记录
    Route::get('city/summary',                            [CityReportController::class, 'summary']);         // 全市汇总统计

    // ── 报名资料管理（市州端查看/补充材料）──
    Route::get('city/registrations/{id}/files',           [CityFileController::class, 'index']);            // 资料列表
    Route::post('city/registrations/{id}/files',          [CityFileController::class, 'store']);            // 补充上传
    Route::delete('city/registration-files/{fileId}',     [CityFileController::class, 'destroy']);          // 删除
});
