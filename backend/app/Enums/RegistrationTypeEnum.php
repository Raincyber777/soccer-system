<?php

namespace App\Enums;

/**
 * 报名类型
 * 1球队端 2高校端 3市州端
 */
enum RegistrationTypeEnum: int
{
    case TEAM    = 1;
    case COLLEGE = 2;
    case CITY    = 3;

    public function label(): string
    {
        return match ($this) {
            self::TEAM    => '球队端',
            self::COLLEGE => '高校端',
            self::CITY    => '市州端',
        };
    }
}
