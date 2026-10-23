<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 报名主表（报名域）
 * 球队报名 / 高校报名 / 市州报送，统一在此表
 * type: 1球队端报名 2高校端报名 3市州端报送
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->unsignedBigInteger('event_id')->comment('赛事ID');
            $table->unsignedBigInteger('team_id')->nullable()->comment('球队/单位ID');
            $table->unsignedBigInteger('school_id')->nullable()->comment('学校ID(高校/中学)');
            $table->unsignedInteger('region_id')->nullable()->comment('所属行政区划');
            $table->tinyInteger('type')->comment('1球队端 2高校端 3市州端');
            $table->tinyInteger('category')->comment('报名组别:1高校组 2中学组 3小学组');
            $table->string('unit_name', 128)->comment('报名单位名称');
            $table->string('contact_name', 64)->nullable()->comment('联系人');
            $table->string('contact_phone', 20)->nullable()->comment('联系电话');
            $table->unsignedSmallInteger('player_count')->default(0)->comment('球员人数');
            $table->unsignedSmallInteger('coach_count')->default(0)->comment('教练人数');
            $table->tinyInteger('audit_status')->default(0)->comment('0待审核 1市级通过 2省级通过 3驳回');
            $table->string('reject_reason', 255)->nullable()->comment('驳回原因(市级驳回)');
            $table->string('province_reject_reason', 255)->nullable()->comment('省级驳回原因');
            $table->unsignedBigInteger('city_audited_by')->nullable()->comment('市州审核人');
            $table->timestamp('city_audited_at')->nullable()->comment('市州审核时间');
            $table->unsignedBigInteger('province_audited_by')->nullable()->comment('省级审核人');
            $table->timestamp('province_audited_at')->nullable()->comment('省级审核时间');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['event_id', 'team_id'], 'uk_event_team');
            $table->index('audit_status', 'idx_audit');
            $table->index('team_id', 'idx_team');
            $table->index('school_id', 'idx_school');
            $table->index('region_id', 'idx_region');
            $table->index('type', 'idx_type');
        });

        Schema::table('registrations', function (Blueprint $table) {
            $table->comment = '赛事报名主表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};
