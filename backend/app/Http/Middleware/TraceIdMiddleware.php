<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 为每个请求生成 trace_id，注入 request attributes 与响应头，便于日志追踪
 */
class TraceIdMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $traceId = $request->header('X-Trace-Id') ?: $this->genTraceId();
        $request->attributes->set('trace_id', $traceId);

        $response = $next($request);

        $response->headers->set('X-Trace-Id', $traceId);

        return $response;
    }

    private function genTraceId(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            random_int(0, 0xffff), random_int(0, 0xffff),
            random_int(0, 0xffff),
            random_int(0, 0x0fff) | 0x4000,
            random_int(0, 0x3fff) | 0x8000,
            random_int(0, 0xffff), random_int(0, 0xffff), random_int(0, 0xffff),
        );
    }
}
