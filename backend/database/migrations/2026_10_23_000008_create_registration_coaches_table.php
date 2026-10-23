<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 报名教练明细（报名域）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_coaches', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->unsignedBigInteger('registration_id')->comment('报名主表ID');
            $table->string('name', 32)->comment('姓名');
            $table->string('id_card', 64)->nullable()->comment('身份证(加密)');
            $table->string('phone', 20)->nullable()->comment('手机号');
            $table->string('certificate_no', 64)->nullable()->comment('教练员证号');
            $table->string('photo_url', 255)->nullable()->comment('头像URL');
            $table->string('role', 16)->nullable()->comment('角色:主教练/助理教练');
            $table->timestamps();

            $table->index('registration_id', 'idx_registration');
        });

        Schema::table('registration_coaches', function (Blueprint $table) {
            $table->comment = '报名教练明细';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_coaches');
    }
};
