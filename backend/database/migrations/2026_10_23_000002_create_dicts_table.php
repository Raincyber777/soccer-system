<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 字典表（公共/融合）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dicts', function (Blueprint $table) {
            $table->increments('id')->comment('主键');
            $table->string('type', 64)->index()->comment('字典类型');
            $table->string('code', 32)->comment('字典编码');
            $table->string('label', 64)->comment('字典标签');
            $table->unsignedInteger('sort')->default(0)->comment('排序');
            $table->tinyInteger('status')->default(1)->comment('1启用 0禁用');
            $table->string('remark', 255)->nullable()->comment('备注');
            $table->timestamps();

            $table->unique(['type', 'code'], 'uk_type_code');
        });

        Schema::table('dicts', function (Blueprint $table) {
            $table->comment = '字典表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dicts');
    }
};
