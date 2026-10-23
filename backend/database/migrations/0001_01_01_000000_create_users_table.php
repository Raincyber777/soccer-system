<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 统一账号表（按技术规范 4.5 节 DDL）
 * 角色：1省级 2市州 3球队 4高校 5运动员 6教练员 9管理员
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->string('username', 64)->unique()->comment('登录账号/手机号');
            $table->string('password')->comment('密码(bcrypt)');
            $table->string('real_name', 64)->nullable()->comment('姓名');
            $table->string('phone', 20)->nullable()->comment('手机号');
            $table->string('id_card', 64)->nullable()->comment('身份证(加密存储)');
            $table->tinyInteger('role')->default(9)->comment('1省级 2市州 3球队 4高校 5运动员 6教练员 9管理员');
            $table->unsignedBigInteger('org_id')->nullable()->comment('所属单位(球队/高校/市州)');
            $table->unsignedInteger('region_id')->nullable()->comment('所属行政区划');
            $table->tinyInteger('status')->default(1)->comment('1启用 0禁用');
            $table->timestamp('last_login_at')->nullable()->comment('最后登录时间');
            $table->string('remark', 255)->nullable()->comment('备注');
            $table->timestamps();
            $table->softDeletes();

            $table->index('role', 'idx_role');
            $table->index('org_id', 'idx_org');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->comment = '统一账号表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
