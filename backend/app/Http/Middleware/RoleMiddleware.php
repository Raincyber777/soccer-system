<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 角色校验中间件
 * 用法：middleware('role:city,province')  多个角色逗号分隔
 * 角色编码对齐 users.role 字段：1省级 2市州 3球队 4高校 5运动员 6教练员 9管理员
 */
class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'code'     => 20001,
                'msg'      => '请先登录',
                'data'     => null,
                'success'  => false,
                'trace_id' => $request->attributes->get('trace_id', ''),
            ]);
        }

        $allowed = array_map('intval', $roles);

        if (! in_array((int) $user->role, $allowed, true)) {
            return response()->json([
                'code'     => 20005,
                'msg'      => '无权限访问',
                'data'     => null,
                'success'  => false,
                'trace_id' => $request->attributes->get('trace_id', ''),
            ]);
        }

        return $next($request);
    }
}
