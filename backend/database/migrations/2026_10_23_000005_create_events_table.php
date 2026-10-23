<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 赛事表（报名域）
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->bigIncrements('id')->comment('主键');
            $table->string('name', 128)->comment('赛事名称');
            $table->unsignedSmallInteger('year')->comment('届次年份');
            $table->tinyInteger('category')->comment('1高校组 2中学组 3小学组');
            $table->datetime('register_start')->nullable()->comment('报名开始');
            $table->datetime('register_end')->nullable()->comment('报名截止');
            $table->datetime('match_start')->nullable()->comment('比赛开始');
            $table->datetime('match_end')->nullable()->comment('比赛结束');
            $table->string('venue', 128)->nullable()->comment('比赛地点');
            $table->text('description')->nullable()->comment('赛事说明');
            $table->tinyInteger('status')->default(1)->comment('1未开始 2报名中 3比赛中 4已结束');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category', 'status'], 'idx_category_status');
            $table->index('year', 'idx_year');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->comment = '赛事表';
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
