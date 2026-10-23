<?php

namespace App\Services\Audit;

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use App\Models\RegistrationPlayer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * 省级审核端 — 球员身份业务
 */
class ProvincePlayerService
{
    public function paginate(Request $request): array
    {
        $query = RegistrationPlayer::query()
            ->with(['registration:id,unit_name,event_id,audit_status', 'registration.event:id,name,year'])
            ->whereHas('registration', fn ($q) => $q->where('audit_status', '>=', 1));

        if ($kw = $request->input('keyword')) {
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'like', "%{$kw}%")
                  ->orWhere('id_card', 'like', "%{$kw}%")
                  ->orWhereHas('registration', fn ($r) => $r->where('unit_name', 'like', "%{$kw}%"));
            });
        }
        if ($request->filled('registration_id')) {
            $query->where('registration_id', $request->input('registration_id'));
        }
        if ($request->filled('audit_status')) {
            $query->where('audit_status', $request->input('audit_status'));
        }

        $pageSize = $request->input('pageSize', 20);
        $pageNum  = $request->input('pageNum', 1);
        $total    = $query->count();
        $list     = $query->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        return ['list' => $list, 'total' => $total, 'pageNum' => $pageNum, 'pageSize' => $pageSize];
    }

    public function detail(int $id): array
    {
        $player = RegistrationPlayer::with(['registration.event:id,name'])->find($id);
        if (! $player) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '球员不存在');
        }
        return $player->toArray();
    }

    public function update(int $id, array $data): void
    {
        $player = RegistrationPlayer::find($id);
        if (! $player) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '球员不存在');
        }
        $player->update($data);

        Log::channel('business')->info('省级修改球员信息', [
            'trace_id'   => request()->attributes->get('trace_id'),
            'player_id'  => $id,
            'updater_id' => request()->user()->id,
            'fields'     => array_keys($data),
        ]);
    }

    public function uploadAvatar(int $id, mixed $file): string
    {
        $player = RegistrationPlayer::find($id);
        if (! $player) {
            throw new BusinessException(ResponseCode::DATA_NOT_FOUND, '球员不存在');
        }

        $path = $file->store("players/{$id}", 'public');
        $url  = Storage::disk('public')->url($path);

        // 删除旧头像
        if ($player->photo_url) {
            $oldPath = str_replace('/storage/', '', parse_url($player->photo_url, PHP_URL_PATH) ?? '');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $player->update(['photo_url' => $url]);

        Log::channel('business')->info('省级上传球员头像', [
            'trace_id'   => request()->attributes->get('trace_id'),
            'player_id'  => $id,
            'updater_id' => request()->user()->id,
        ]);

        return $url;
    }
}
