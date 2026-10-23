<?php

namespace App\Support;

use App\Enums\ResponseCode;
use Illuminate\Http\JsonResponse;

/**
 * 统一响应封装
 * 所有接口必须经 Result 返回，结构固定：
 * { code, msg, data, success, trace_id }
 */
class Result
{
    public static function success(string $msg = '成功', mixed $data = null): JsonResponse
    {
        return self::response(ResponseCode::SUCCESS, $msg, $data);
    }

    public static function fail(ResponseCode $code, string $msg = ''): JsonResponse
    {
        return self::response($code, $msg ?: $code->msg(), null);
    }

    public static function failWithMsg(string $msg, ResponseCode $code = ResponseCode::BUSINESS_ERROR): JsonResponse
    {
        return self::response($code, $msg, null);
    }

    protected static function response(ResponseCode $code, string $msg, mixed $data): JsonResponse
    {
        $traceId = request()->attributes->get('trace_id') ?: '';

        return response()->json([
            'code'      => $code->value,
            'msg'       => $msg,
            'data'      => $data,
            'success'   => $code === ResponseCode::SUCCESS,
            'trace_id'  => $traceId,
        ]);
    }
}
