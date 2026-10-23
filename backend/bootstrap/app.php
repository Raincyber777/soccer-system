<?php

use App\Enums\ResponseCode;
use App\Exceptions\BusinessException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // 全局中间件（API 组前置 TraceId）
        $middleware->prependToGroup('api', \App\Http\Middleware\TraceIdMiddleware::class);

        // 中间件别名
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (BusinessException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => $e->getCode(),
                    'msg'      => $e->getMessage(),
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ]);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => ResponseCode::PARAM_ERROR->value,
                    'msg'      => '参数错误：' . collect($e->errors())->flatten()->first(),
                    'data'     => $e->errors(),
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => ResponseCode::UNAUTHORIZED->value,
                    'msg'      => ResponseCode::UNAUTHORIZED->msg(),
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 401);
            }
        });

        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => ResponseCode::DATA_NOT_FOUND->value,
                    'msg'      => ResponseCode::DATA_NOT_FOUND->msg(),
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 404);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => ResponseCode::DATA_NOT_FOUND->value,
                    'msg'      => '接口不存在',
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 404);
            }
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'code'     => ResponseCode::PARAM_ERROR->value,
                    'msg'      => '请求方法不允许',
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 405);
            }
        });

        // 兜底 — 覆盖 Sanctum 无 Token 时 route('login') 抛新异常的情况
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                $msg = $e->getMessage();

                // Sanctum 无 Token → AuthenticationException 被 route('login') 覆盖
                if (str_contains($msg, 'Route [login] not defined')) {
                    return response()->json([
                        'code'     => ResponseCode::UNAUTHORIZED->value,
                        'msg'      => ResponseCode::UNAUTHORIZED->msg(),
                        'data'     => null,
                        'success'  => false,
                        'trace_id' => $request->attributes->get('trace_id', ''),
                    ], 401);
                }

                $code = $e instanceof \Illuminate\Database\QueryException
                    ? ResponseCode::DATABASE_ERROR
                    : ResponseCode::SYSTEM_ERROR;

                return response()->json([
                    'code'     => $code->value,
                    'msg'      => config('app.debug') ? $msg : $code->msg(),
                    'data'     => null,
                    'success'  => false,
                    'trace_id' => $request->attributes->get('trace_id', ''),
                ], 500);
            }
        });
    })->create();
