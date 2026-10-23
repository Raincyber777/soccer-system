<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 身份证字段加密存储后长度不足
 * Crypt 加密后的密文为 base64(AES-256-CBC)，约 330 字符，原 string(64) 会溢出
 * 统一放宽为 string(255)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('id_card', 255)->nullable()->comment('身份证(加密存储)')->change();
        });

        Schema::table('registration_players', function (Blueprint $table) {
            $table->string('id_card', 255)->comment('身份证(加密)')->change();
        });

        Schema::table('registration_coaches', function (Blueprint $table) {
            $table->string('id_card', 255)->nullable()->comment('身份证(加密)')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('id_card', 64)->nullable()->comment('身份证(加密存储)')->change();
        });

        Schema::table('registration_players', function (Blueprint $table) {
            $table->string('id_card', 64)->comment('身份证(加密)')->change();
        });

        Schema::table('registration_coaches', function (Blueprint $table) {
            $table->string('id_card', 64)->nullable()->comment('身份证(加密)')->change();
        });
    }
};
