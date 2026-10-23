<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 用户操作日志（公共/融合）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operation_logs', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->unsignedBigInteger('user_id')->nullable()->comment('操作人ID');
            $table->string('module', 64)->nullable()->comment('模块');
            $table->string('action', 64)->comment('操作动作');
            $table->string('target_type', 64)->nullable()->comment('目标类型');
            $table->unsignedBigInteger('target_id')->nullable()->comment('目标ID');
            $table->string('ip', 64)->nullable()->comment('IP');
            $table->string('trace_id', 64)->nullable()->comment('追踪ID');
            $table->text('detail')->nullable()->comment('详情(JSON)');
            $table->timestamps();

            $table->index('user_id', 'idx_user');
            $table->index(['target_type', 'target_id'], 'idx_target');
            $table->index('created_at', 'idx_created');
        });

        Schema::table('operation_logs', function (Blueprint $table) {
            $table->comment = '用户操作日志';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operation_logs');
    }
};
