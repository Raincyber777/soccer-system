<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 统一驳回原因字段
 * 市州端与省级端对外统一使用 reject_reason，
 * 原 province_reject_reason 数据合并到 reject_reason 后删除该列
 */
return new class extends Migration
{
    public function up(): void
    {
        // 已有省级驳回原因回填到 reject_reason
        DB::statement(
            'UPDATE registrations SET reject_reason = province_reject_reason
             WHERE province_reject_reason IS NOT NULL AND reject_reason IS NULL'
        );

        Schema::table('registrations', function (Blueprint $table) {
            $table->dropColumn('province_reject_reason');
        });
    }

    public function down(): void
    {
        Schema::table('registrations', function (Blueprint $table) {
            $table->string('province_reject_reason', 255)->nullable()->comment('省级驳回原因')->after('reject_reason');
        });
    }
};
