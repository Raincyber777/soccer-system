<?php

namespace App\Http\Controllers\Api\V1\Common;

use App\Models\File;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * 统一上传入口（规范 5 节约定）
 * POST /api/v1/upload
 * 返回 { url, path }
 */
class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file'      => ['required', 'file', 'max:20480'],
            'file_type' => ['nullable', 'string', 'max:32'],
        ]);

        $file = $request->file('file');
        $type = $request->input('file_type', 'general');

        $path = $file->store($type . '/' . date('Ym'), 'public');
        $url  = Storage::disk('public')->url($path);

        $record = File::create([
            'original_name' => $file->getClientOriginalName(),
            'storage_path'  => $path,
            'url'           => $url,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'file_type'     => $type,
        ]);

        Log::channel('api')->info('统一上传', [
            'trace_id'   => $request->attributes->get('trace_id'),
            'file_id'    => $record->id,
            'file_type'  => $type,
            'size'       => $file->getSize(),
            'uploader_id' => $request->user()?->id,
        ]);

        return Result::success('上传成功', [
            'id'            => $record->id,
            'url'           => $url,
            'path'          => $path,
            'file_name'     => $record->original_name,
            'mime_type'     => $record->mime_type,
            'size'          => $record->size,
        ]);
    }
}
