<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 报名球员明细（报名域）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_players', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->unsignedBigInteger('registration_id')->comment('报名主表ID');
            $table->unsignedBigInteger('player_id')->nullable()->comment('关联球员档案');
            $table->string('name', 32)->comment('姓名');
            $table->string('id_card', 64)->comment('身份证(加密)');
            $table->unsignedSmallInteger('jersey_no')->nullable()->comment('球衣号');
            $table->string('position', 16)->nullable()->comment('位置');
            $table->string('phone', 20)->nullable()->comment('手机号');
            $table->string('photo_url', 255)->nullable()->comment('头像URL');
            $table->unsignedSmallInteger('age')->nullable()->comment('年龄');
            $table->string('gender', 4)->nullable()->comment('性别');
            $table->tinyInteger('audit_status')->default(0)->comment('0正常 1异常');
            $table->string('audit_remark', 255)->nullable()->comment('审核备注');
            $table->timestamps();

            $table->index('registration_id', 'idx_registration');
            $table->index('player_id', 'idx_player');
            $table->index('id_card', 'idx_id_card');
        });

        Schema::table('registration_players', function (Blueprint $table) {
            $table->comment = '报名球员明细';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_players');
    }
};
