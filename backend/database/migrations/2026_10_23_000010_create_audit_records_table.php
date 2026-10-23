<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 审核记录（报名域通用）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_records', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->string('auditable_type', 64)->comment('审核对象类型');
            $table->unsignedBigInteger('auditable_id')->comment('审核对象ID');
            $table->unsignedBigInteger('registration_id')->nullable()->comment('关联报名ID');
            $table->tinyInteger('from_status')->comment('审核前状态');
            $table->tinyInteger('to_status')->comment('审核后状态');
            $table->string('action', 16)->comment('approve/reject');
            $table->string('reason', 255)->nullable()->comment('驳回原因');
            $table->unsignedBigInteger('auditor_id')->comment('审核人');
            $table->string('auditor_name', 64)->nullable()->comment('审核人姓名');
            $table->tinyInteger('audit_level')->comment('1市级 2省级');
            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id'], 'idx_auditable');
            $table->index('registration_id', 'idx_registration');
            $table->index('audit_level', 'idx_level');
            $table->index('created_at', 'idx_created');
        });

        Schema::table('audit_records', function (Blueprint $table) {
            $table->comment = '审核记录';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_records');
    }
};
