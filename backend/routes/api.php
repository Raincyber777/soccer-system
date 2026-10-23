<?php

use Illuminate\Support\Facades\Route;

// 统一 API 基础路径 /api/v1 — 各域文件自行定义前缀
// 三组各自维护对应文件，融合组维护公共路由（登录/上传等）

// 融合组：公共路由
require __DIR__.'/api/common.php';

// 组1：报名域（市州端 + 省级审核端在此文件中）
require __DIR__.'/api/registration.php';

// 省级审核端专用路由
require __DIR__.'/api/audit.php';
