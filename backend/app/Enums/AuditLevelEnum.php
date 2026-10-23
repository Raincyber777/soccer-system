<?php

namespace App\Enums;

/**
 * 审核级别
 */
enum AuditLevelEnum: int
{
    case CITY     = 1;
    case PROVINCE = 2;
}
