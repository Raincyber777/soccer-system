<?php

namespace App\Services\Audit;

use App\Enums\AuditLevelEnum;
use App\Enums\AuditStatusEnum;
use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\AuditRecord;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 省级审核端 — 报名查询/审核业务
 */
class ProvinceRegistrationService
{
    public function paginate(array $params): array
    {
        $query = Registration::query()
            ->with(['event:id,name,year', 'region:id,name']);

        // 注意：audit_status=0（待审核）不能用作假值判断，统一用 !== '' 判定
        if (($params['event_id'] ?? '') !== '') {
            $query->where('event_id', $params['event_id']);
        }
        if (($params['audit_status'] ?? '') !== '') {
            $query->where('audit_status', $params['audit_status']);
        }
        if (($params['category'] ?? '') !== '') {
            $query->where('category', $params['category']);
        }
        if (($params['type'] ?? '') !== '') {
            $query->where('type', $params['type']);
        }
        if (($params['region_id'] ?? '') !== '') {
            $query->where('region_id', $params['region_id']);
        }
        if (($params['keyword'] ?? '') !== '') {
            $kw = $params['keyword'];
            $query->where(function ($q) use ($kw) {
                $q->where('unit_name', 'like', "%{$kw}%")
                  ->orWhere('contact_name', 'like', "%{$kw}%")
                  ->orWhere('contact_phone', 'like', "%{$kw}%");
            });
        }

        $pageSize = $params['pageSize'] ?? 10;
        $pageNum  = $params['pageNum'] ?? 1;

        $total = $query->count();
        $list  = $query->orderByDesc('audit_status')
            ->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get([
                'id', 'event_id', 'unit_name', 'type', 'category', 'region_id',
                'player_count', 'coach_count', 'audit_status',
                'contact_name', 'contact_phone', 'reject_reason',
                'created_at', 'city_audited_at', 'province_audited_at',
            ]);

        return [
            'list'     => $list,
            'total'    => $total,
            'pageNum'  => $pageNum,
            'pageSize' => $pageSize,
        ];
    }

    public function detail(int $id): array
    {
        $registration = Registration::query()
            ->with([
                'event:id,name,year,category',
                'region:id,name',
                'players',
                'coaches',
                'files.file:id,original_name,url,storage_path',
                'auditRecords' => fn ($q) => $q->orderByDesc('id'),
            ])
            ->find($id);

        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        return $registration->toArray();
    }

    /**
     * 查看盖章扫描件
     */
    public function sealFiles(int $id): array
    {
        $registration = Registration::find($id);
        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        return $registration->files()
            ->with(['file:id,original_name,url,storage_path,mime_type'])
            ->where('file_type', 'seal')
            ->get()
            ->toArray();
    }

    /**
     * 省级审核通过（仅能审核市级已通过的）
     */
    public function approve(int $id, mixed $user): void
    {
        DB::transaction(function () use ($id, $user) {
            $registration = Registration::lockForUpdate()->find($id);

            if (! $registration) {
                throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
            }

            if ($registration->audit_status !== AuditStatusEnum::CITY_APPROVED->value) {
                throw new BusinessException(ResponseCode::BUSINESS_ERROR, '仅市级已通过的报名可进行省级审核');
            }

            $registration->update([
                'audit_status'       => AuditStatusEnum::PROVINCE_APPROVED->value,
                'province_audited_by' => $user->id,
                'province_audited_at' => now(),
            ]);

            AuditRecord::create([
                'auditable_type'  => Registration::class,
                'auditable_id'    => $registration->id,
                'registration_id' => $registration->id,
                'from_status'     => AuditStatusEnum::CITY_APPROVED->value,
                'to_status'       => AuditStatusEnum::PROVINCE_APPROVED->value,
                'action'          => 'approve',
                'auditor_id'      => $user->id,
                'auditor_name'    => $user->real_name ?: $user->username,
                'audit_level'     => AuditLevelEnum::PROVINCE->value,
            ]);

            Log::channel('business')->info('省级审核通过', [
                'trace_id'        => request()->attributes->get('trace_id'),
                'registration_id' => $registration->id,
                'auditor_id'      => $user->id,
            ]);
        });
    }

    /**
     * 省级审核驳回
     */
    public function reject(int $id, array $data, mixed $user): void
    {
        DB::transaction(function () use ($id, $data, $user) {
            $registration = Registration::lockForUpdate()->find($id);

            if (! $registration) {
                throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
            }

            if ($registration->audit_status !== AuditStatusEnum::CITY_APPROVED->value) {
                throw new BusinessException(ResponseCode::BUSINESS_ERROR, '仅市级已通过的报名可进行省级驳回');
            }

            $registration->update([
                'audit_status'         => AuditStatusEnum::REJECTED->value,
                'reject_reason'        => $data['reject_reason'],
                'province_audited_by'   => $user->id,
                'province_audited_at'   => now(),
            ]);

            AuditRecord::create([
                'auditable_type'  => Registration::class,
                'auditable_id'    => $registration->id,
                'registration_id' => $registration->id,
                'from_status'     => AuditStatusEnum::CITY_APPROVED->value,
                'to_status'       => AuditStatusEnum::REJECTED->value,
                'action'          => 'reject',
                'reason'          => $data['reject_reason'],
                'auditor_id'      => $user->id,
                'auditor_name'    => $user->real_name ?: $user->username,
                'audit_level'     => AuditLevelEnum::PROVINCE->value,
            ]);

            Log::channel('business')->info('省级审核驳回', [
                'trace_id'        => request()->attributes->get('trace_id'),
                'registration_id' => $registration->id,
                'auditor_id'      => $user->id,
                'reason'          => $data['reject_reason'],
            ]);
        });
    }

    /**
     * 下载报名表 Word + 学籍验证材料（打包 zip）
     */
    public function download(int $id, mixed $user): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $registration = Registration::with([
            'event:id,name,year',
            'files.file',
            'players',
            'coaches',
        ])->find($id);

        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        $tmpDir = storage_path("app/downloads/{$id}_" . time());
        mkdir($tmpDir, 0755, true);

        // 1. 生成 Word 报名表
        $wordPath = $tmpDir . DIRECTORY_SEPARATOR . $registration->unit_name . '_报名表.docx';
        $this->generateWord($registration, $wordPath);

        // 2. 复制学籍验证材料
        foreach ($registration->files as $rf) {
            if ($rf->file_type === 'enrollment' && $rf->file && $rf->file->storage_path) {
                $fullPath = storage_path('app/public/' . ltrim($rf->file->storage_path, '/'));
                if (file_exists($fullPath)) {
                    copy($fullPath, $tmpDir . DIRECTORY_SEPARATOR . $rf->file->original_name);
                }
            }
        }

        // 3. 打包 zip
        $zipName = $registration->unit_name . '_报名资料_' . date('Ymd') . '.zip';
        $zipPath = storage_path("app/downloads/{$zipName}");
        $this->packZip($tmpDir, $zipPath);

        // 4. 清理临时目录
        $this->rmdir($tmpDir);

        Log::channel('api')->info('省级下载报名资料', [
            'trace_id'        => request()->attributes->get('trace_id'),
            'registration_id' => $id,
            'downloader_id'   => $user->id,
        ]);

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }

    /**
     * 生成 Word 报名表
     */
    protected function generateWord(Registration $registration, string $path): void
    {
        $phpWord = new \PhpOffice\PhpWord\PhpWord();

        $section = $phpWord->addSection();
        $section->addText("{$registration->event?->name} 报名表", ['size' => 18, 'bold' => true], ['alignment' => 'center']);
        $section->addTextBreak();

        $section->addText('一、基本信息', ['bold' => true]);
        $section->addText("报名单位：{$registration->unit_name}");
        $section->addText("报名组别：{$registration->category}");
        $section->addText("联系人：{$registration->contact_name}  电话：{$registration->contact_phone}");
        $section->addTextBreak();

        $section->addText('二、球员名单', ['bold' => true]);
        $table = $section->addTable();
        $table->addRow();
        foreach (['球衣号', '姓名', '身份证号', '位置', '手机号'] as $h) {
            $table->addCell()->addText($h, ['bold' => true]);
        }
        foreach ($registration->players as $p) {
            $table->addRow();
            $table->addCell()->addText($p->jersey_no ?? '');
            $table->addCell()->addText($p->name);
            $table->addCell()->addText($this->maskIdCard($p->id_card));
            $table->addCell()->addText($p->position ?? '');
            $table->addCell()->addText($p->phone ?? '');
        }
        $section->addTextBreak();

        if ($registration->coaches->isNotEmpty()) {
            $section->addText('三、教练员名单', ['bold' => true]);
            $cTable = $section->addTable();
            $cTable->addRow();
            foreach (['姓名', '身份证号', '角色', '证书号', '电话'] as $h) {
                $cTable->addCell()->addText($h, ['bold' => true]);
            }
            foreach ($registration->coaches as $c) {
                $cTable->addRow();
                $cTable->addCell()->addText($c->name);
                $cTable->addCell()->addText($c->id_card ? $this->maskIdCard($c->id_card) : '');
                $cTable->addCell()->addText($c->role ?? '');
                $cTable->addCell()->addText($c->certificate_no ?? '');
                $cTable->addCell()->addText($c->phone ?? '');
            }
        }

        $phpWord->save($path);
    }

    protected function maskIdCard(string $idCard): string
    {
        if (strlen($idCard) < 10) return $idCard;
        return substr($idCard, 0, 6) . '********' . substr($idCard, -4);
    }

    protected function packZip(string $srcDir, string $zipPath): void
    {
        $zip = new \ZipArchive();
        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($srcDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($files as $file) {
            if ($file->isFile()) {
                $zip->addFile($file->getPathname(), $file->getFilename());
            }
        }
        $zip->close();
    }

    protected function rmdir(string $dir): void
    {
        if (! is_dir($dir)) return;
        foreach (scandir($dir) as $f) {
            if ($f === '.' || $f === '..') continue;
            $p = $dir . DIRECTORY_SEPARATOR . $f;
            is_dir($p) ? $this->rmdir($p) : unlink($p);
        }
        rmdir($dir);
    }
}
