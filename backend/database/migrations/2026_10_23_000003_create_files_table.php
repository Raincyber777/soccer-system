<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 统一附件表（公共/融合）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->string('original_name', 255)->comment('原始文件名');
            $table->string('storage_path', 500)->comment('存储路径');
            $table->string('url', 500)->nullable()->comment('访问URL');
            $table->string('mime_type', 128)->nullable()->comment('MIME类型');
            $table->unsignedBigInteger('size')->default(0)->comment('文件大小(字节)');
            $table->string('file_type', 32)->nullable()->comment('文件分类(盖章件/照片/PDF/学籍材料...)');
            $table->timestamps();

            $table->index('file_type', 'idx_file_type');
        });

        Schema::table('files', function (Blueprint $table) {
            $table->comment = '统一附件表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
