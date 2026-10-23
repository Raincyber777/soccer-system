<?php

namespace App\Services\Audit;

use App\Enums\AuditStatusEnum;
use App\Models\Registration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * 省级审核端 — 导出业务
 */
class ProvinceExportService
{
    /**
     * 导出报名列表 Excel（.xlsx）
     */
    public function exportExcel(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $query = Registration::query()
            ->with(['event:id,name,year', 'region:id,name']);

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->input('event_id'));
        }
        if ($request->filled('audit_status')) {
            $query->where('audit_status', $request->input('audit_status'));
        }
        if ($request->filled('region_id')) {
            $query->where('region_id', $request->input('region_id'));
        }

        $list = $query->orderByDesc('id')->get();

        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('报名列表');

        $headers = [
            'ID', '赛事', '届次', '报名单位', '市州', '组别', '类型',
            '球员数', '教练数', '审核状态', '联系人', '联系电话',
            '市级审核时间', '省级审核时间', '创建时间',
        ];
        $sheet->fromArray($headers, null, 'A1');

        $row = 2;
        foreach ($list as $r) {
            $sheet->fromArray([
                $r->id,
                $r->event?->name ?? '',
                $r->event?->year ?? '',
                $r->unit_name,
                $r->region?->name ?? '',
                $r->category,
                $r->type,
                $r->player_count,
                $r->coach_count,
                AuditStatusEnum::tryFrom($r->audit_status)?->label() ?? '',
                $r->contact_name,
                $r->contact_phone,
                $r->city_audited_at?->format('Y-m-d H:i:s') ?? '',
                $r->province_audited_at?->format('Y-m-d H:i:s') ?? '',
                $r->created_at?->format('Y-m-d H:i:s') ?? '',
            ], null, "A{$row}");
            $row++;
        }

        // 表头样式：加粗 + 浅灰底 + 居中
        $lastCol = $sheet->getHighestColumn();
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastCol}1")->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A1:{$lastCol}1")->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setRGB('F2F2F2');

        // 列宽自适应
        foreach (range('A', $lastCol) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->freezePane('A2');

        $filename = '报名列表_' . date('Ymd_His') . '.xlsx';
        $path     = storage_path("app/downloads/{$filename}");
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();

        Log::channel('business')->info('省级导出报名列表', [
            'trace_id'   => request()->attributes->get('trace_id'),
            'user_id'    => request()->user()->id,
            'count'      => count($list),
        ]);

        return response()->download($path, $filename)->deleteFileAfterSend(true);
    }

    /**
     * 导出通过名单 Word
     */
    public function approvedListWord(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $query = Registration::query()
            ->with(['event:id,name,year', 'region:id,name', 'players', 'coaches'])
            ->where('audit_status', AuditStatusEnum::PROVINCE_APPROVED->value);

        if ($eventId = $request->input('event_id')) {
            $query->where('event_id', $eventId);
        }

        $list = $query->orderByDesc('id')->get();

        $phpWord = new \PhpOffice\PhpWord\PhpWord();
        $section = $phpWord->addSection();

        $section->addText('省级审核通过名单', ['size' => 18, 'bold' => true], ['alignment' => 'center']);
        $section->addTextBreak();

        foreach ($list as $r) {
            $section->addText("【{$r->unit_name}】{$r->event?->name}", ['bold' => true, 'size' => 13]);
            $section->addText("市州：{$r->region?->name}  组别：{$r->category}  球员{$r->player_count}人  教练{$r->coach_count}人");
            $section->addText("省级审核时间：" . $r->province_audited_at?->format('Y-m-d H:i:s'));

            // 球员简表
            if ($r->players->isNotEmpty()) {
                $table = $section->addTable();
                $table->addRow();
                foreach (['球衣号', '姓名', '位置'] as $h) {
                    $table->addCell()->addText($h, ['bold' => true]);
                }
                foreach ($r->players as $p) {
                    $table->addRow();
                    $table->addCell()->addText((string) ($p->jersey_no ?? ''));
                    $table->addCell()->addText($p->name);
                    $table->addCell()->addText($p->position ?? '');
                }
            }

            $section->addTextBreak();
        }

        $filename = '通过名单_' . date('Ymd_His') . '.docx';
        $path     = storage_path("app/downloads/{$filename}");
        $phpWord->save($path);

        Log::channel('business')->info('省级导出通过名单 Word', [
            'trace_id'   => request()->attributes->get('trace_id'),
            'user_id'    => request()->user()->id,
            'count'      => count($list),
        ]);

        return response()->download($path, $filename)->deleteFileAfterSend(true);
    }
}
