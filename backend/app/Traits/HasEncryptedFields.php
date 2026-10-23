<?php

namespace App\Traits;

use Illuminate\Support\Facades\Crypt;

/**
 * 敏感字段加密/解密 Accessor + Mutator
 * 数据库存密文，业务层透明使用明文
 */
trait HasEncryptedFields
{
    public function getEncryptedField(string $key): ?string
    {
        $raw = $this->attributes[$key] ?? null;
        if (! $raw) {
            return null;
        }
        try {
            return Crypt::decryptString($raw);
        } catch (\Throwable) {
            // 兼容历史明文数据
            return $raw;
        }
    }

    public function setEncryptedField(string $key, ?string $value): void
    {
        if ($value === null) {
            $this->attributes[$key] = null;
            return;
        }
        $this->attributes[$key] = Crypt::encryptString($value);
    }

    /**
     * 脱敏展示（只在 accessor 中按需调用）
     */
    public static function maskIdCard(?string $idCard): string
    {
        if (! $idCard || strlen($idCard) < 10) {
            return $idCard ?? '';
        }
        return substr($idCard, 0, 6) . '********' . substr($idCard, -4);
    }

    public static function maskPhone(?string $phone): string
    {
        if (! $phone || strlen($phone) < 7) {
            return $phone ?? '';
        }
        return substr($phone, 0, 3) . '****' . substr($phone, -4);
    }
}
