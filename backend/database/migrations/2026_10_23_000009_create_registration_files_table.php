<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 报名资料（盖章件/学籍材料/报名表PDF）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_files', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->unsignedBigInteger('registration_id')->comment('报名主表ID');
            $table->unsignedBigInteger('file_id')->comment('关联files表');
            $table->string('file_type', 32)->comment('seal:盖章件 id_card:身份证 enrollment:学籍材料 form:报名表PDF other:其他');
            $table->string('file_name', 255)->comment('原始文件名');
            $table->timestamps();

            $table->index('registration_id', 'idx_registration');
            $table->index('file_type', 'idx_file_type');
        });

        Schema::table('registration_files', function (Blueprint $table) {
            $table->comment = '报名资料附件';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_files');
    }
};
