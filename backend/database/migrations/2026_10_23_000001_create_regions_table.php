<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 行政区划表（公共/融合）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->increments('id')->comment('主键');
            $table->unsignedInteger('parent_id')->default(0)->comment('父级ID');
            $table->string('code', 16)->unique()->comment('区划代码');
            $table->string('name', 64)->comment('区划名称');
            $table->tinyInteger('level')->comment('1省 2市州 3区县');
            $table->unsignedInteger('sort')->default(0)->comment('排序');
            $table->timestamps();

            $table->index('parent_id', 'idx_parent');
            $table->index('level', 'idx_level');
        });

        Schema::table('regions', function (Blueprint $table) {
            $table->comment = '行政区划表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regions');
    }
};
