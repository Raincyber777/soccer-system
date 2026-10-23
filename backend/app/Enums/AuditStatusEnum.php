<?php

namespace App\Enums;

/**
 * 报名审核状态（对齐规范 5 节字典约定）
 * 0待审核 1市级通过 2省级通过 3驳回
 */
enum AuditStatusEnum: int
{
    case PENDING          = 0;
    case CITY_APPROVED    = 1;
    case PROVINCE_APPROVED = 2;
    case REJECTED         = 3;

    public function label(): string
    {
        return match ($this) {
            self::PENDING           => '待审核',
            self::CITY_APPROVED     => '市级通过',
            self::PROVINCE_APPROVED => '省级通过',
            self::REJECTED          => '已驳回',
        };
    }
}
