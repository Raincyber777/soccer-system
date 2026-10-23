<?php

namespace App\Http\Controllers\Api\V1\Audit;

use App\Services\Audit\ProvinceExportService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * 省级审核端 — 报名情况导出
 */
class ProvinceExportController extends Controller
{
    public function __construct(private readonly ProvinceExportService $service) {}

    public function registrations(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        return $this->service->exportExcel($request);
    }

    public function approvedWord(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        return $this->service->approvedListWord($request);
    }
}
