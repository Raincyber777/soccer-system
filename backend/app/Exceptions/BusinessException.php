<?php

namespace App\Exceptions;

use App\Enums\ResponseCode;
use Exception;

/**
 * 业务异常 — Service 层主动抛出
 * 由 Handler 统一转换为 Result 响应
 */
class BusinessException extends Exception
{
    public function __construct(
        public readonly ResponseCode $responseCode = ResponseCode::BUSINESS_ERROR,
        string $message = '',
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message ?: $responseCode->msg(), $responseCode->value, $previous);
    }
}
