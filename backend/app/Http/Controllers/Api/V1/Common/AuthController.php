<?php

namespace App\Http\Controllers\Api\V1\Common;

use App\Models\User;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * 统一登录（融合组维护）
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'username' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $request->input('username'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            return response()->json([
                'code'    => 20001,
                'msg'     => '账号或密码错误',
                'data'    => null,
                'success' => false,
            ]);
        }

        if ((int) $user->status !== 1) {
            return response()->json([
                'code'    => 20006,
                'msg'     => '账号已被禁用',
                'data'    => null,
                'success' => false,
            ]);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('api')->plainTextToken;

        Log::channel('api')->info('用户登录', [
            'trace_id'   => $request->attributes->get('trace_id'),
            'user_id'    => $user->id,
            'role'       => $user->role,
            'ip'         => $request->ip(),
        ]);

        return Result::success('登录成功', [
            'token' => $token,
            'user'  => [
                'id'       => $user->id,
                'username' => $user->username,
                'real_name' => $user->real_name,
                'role'     => $user->role,
                'region_id' => $user->region_id,
                'org_id'   => $user->org_id,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();
        return Result::success('已登出');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return Result::success('查询成功', $user->load('region:id,name'));
    }
}
