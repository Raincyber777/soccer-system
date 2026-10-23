<?php

namespace App\Services\Registration;

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\File;
use App\Models\Registration;
use App\Models\RegistrationFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * 市州端 — 报名资料业务
 */
class CityFileService
{
    public function index(int $registrationId, mixed $user): array
    {
        $registration = Registration::where('region_id', $user->region_id)->find($registrationId);
        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        return RegistrationFile::query()
            ->with(['file'])
            ->where('registration_id', $registrationId)
            ->orderByDesc('id')
            ->get()
            ->toArray();
    }

    public function upload(int $registrationId, Request $request, mixed $user): void
    {
        $registration = Registration::where('region_id', $user->region_id)->find($registrationId);
        if (! $registration) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '报名记录不存在');
        }

        DB::transaction(function () use ($registrationId, $request, $user) {
            foreach ($request->file('files') as $file) {
                $path = $file->store("registrations/{$registrationId}", 'public');

                $fileRecord = File::create([
                    'original_name' => $file->getClientOriginalName(),
                    'storage_path'  => $path,
                    'url'           => Storage::disk('public')->url($path),
                    'mime_type'     => $file->getMimeType(),
                    'size'          => $file->getSize(),
                    'file_type'     => $request->input('file_type'),
                ]);

                RegistrationFile::create([
                    'registration_id' => $registrationId,
                    'file_id'         => $fileRecord->id,
                    'file_type'       => $request->input('file_type'),
                    'file_name'       => $file->getClientOriginalName(),
                ]);
            }

            Log::channel('business')->info('市州端补充上传报名资料', [
                'trace_id'        => $request->attributes->get('trace_id'),
                'registration_id' => $registrationId,
                'uploader_id'     => $user->id,
                'file_type'       => $request->input('file_type'),
                'count'           => count($request->file('files')),
            ]);
        });
    }

    public function destroy(int $fileId, mixed $user): void
    {
        $regFile = RegistrationFile::query()
            ->whereHas('registration', fn ($q) => $q->where('region_id', $user->region_id))
            ->find($fileId);

        if (! $regFile) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '资料不存在');
        }

        $file = File::find($regFile->file_id);
        if ($file && Storage::disk('public')->exists($file->storage_path)) {
            Storage::disk('public')->delete($file->storage_path);
        }

        $regFile->delete();
        $file?->delete();
    }
}
