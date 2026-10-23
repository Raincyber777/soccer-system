<?php

namespace Database\Seeders;

use App\Models\AuditRecord;
use App\Models\Event;
use App\Models\File;
use App\Models\OperationLog;
use App\Models\Registration;
use App\Models\RegistrationCoach;
use App\Models\RegistrationFile;
use App\Models\RegistrationPlayer;
use App\Models\Region;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * 联调用演示数据 — 可重复执行（幂等）
 *
 * 覆盖：
 *  - 3 个账号：省级 / 长沙市 / 株洲市
 *  - 3 个赛事：中学组 / 小学组 / 高校组
 *  - 11 条报名：审核状态 0/1/2/3 全覆盖，类型 1/2/3 全覆盖，跨 4 个市州
 *  - 球员 / 教练 / 盖章件 / 学籍材料 / 审核记录 / 操作日志
 */
class DemoDataSeeder extends Seeder
{
    /** 球员姓名池 */
    private array $playerNames = [
        '张浩然', '李思远', '王梓轩', '刘子涵', '陈骏熙', '杨博文', '黄一鸣', '周奕辰',
        '吴天佑', '徐嘉豪', '孙泽宇', '马俊杰', '朱宇轩', '胡锦程', '郭明轩', '何瑞霖',
        '高子墨', '林书豪', '罗一凡', '郑天翔', '谢梓豪', '唐浩然', '许嘉铭', '邓子昂',
    ];

    private array $coachNames = ['赵志强', '钱国立', '孙建军', '李海涛', '周文斌'];

    private array $positions = ['GK', 'DF', 'MF', 'FW'];

    public function run(): void
    {
        $province = Region::where('name', '湖南省')->first();
        $changsha = Region::where('name', '长沙市')->first();
        $zhuzhou = Region::where('name', '株洲市')->first();
        $yueyang = Region::where('name', '岳阳市')->first();
        $changde = Region::where('name', '常德市')->first();

        if (! $changsha || ! $zhuzhou) {
            $this->command->error('行政区划数据缺失，请先执行 RegionSeeder');
            return;
        }

        // ── 1. 账号 ──
        $provinceUser = $this->makeUser('province_admin', '省级审核员', 1, $province?->id);
        $csUser       = $this->makeUser('city_changsha', '长沙管理员', 2, $changsha->id);
        $zzUser       = $this->makeUser('city_zhuzhou', '株洲管理员', 2, $zhuzhou->id);

        // ── 2. 赛事 ──
        $e1 = $this->makeEvent('2026年湖南省青少年校园足球联赛（中学组）', 2026, 2);
        $e2 = $this->makeEvent('2026年湖南省青少年校园足球联赛（小学组）', 2026, 3);
        $e3 = $this->makeEvent('2026年湖南省大学生足球联赛', 2026, 1);

        // ── 3. 报名（event, 单位, 类型, 市州, 状态, 球员数, 教练数, 额外字段）──
        $plan = [
            [$e1, '长沙市代表队',       3, $changsha, 2, 18, 2, ['city_by' => $csUser, 'province_by' => $provinceUser]],
            [$e1, '株洲市代表队',       3, $zhuzhou, 1, 16, 2, ['city_by' => $zzUser]],
            [$e1, '岳阳市代表队',       3, $yueyang, 0, 20, 2, []],
            [$e1, '常德市代表队',       3, $changde, 3, 20, 2, ['city_by' => $csUser, 'reject' => '球员学籍材料缺失，请补充后重新报送']],
            [$e1, '长沙市第一中学',     1, $changsha, 1, 22, 1, ['team_id' => 1001, 'city_by' => $csUser]],
            [$e1, '长沙市雅礼中学',     1, $changsha, 0, 18, 2, ['team_id' => 1003]],
            [$e1, '株洲市第二中学',     1, $zhuzhou, 0, 20, 2, ['team_id' => 1002]],
            [$e2, '长沙市实验小学',     1, $changsha, 2, 14, 1, ['team_id' => 2001, 'city_by' => $csUser, 'province_by' => $provinceUser]],
            [$e2, '株洲市天元小学',     1, $zhuzhou, 1, 14, 1, ['team_id' => 2002, 'city_by' => $zzUser]],
            [$e3, '湖南师范大学',       2, $changsha, 2, 24, 2, ['school_id' => 3001, 'city_by' => $csUser, 'province_by' => $provinceUser]],
            [$e3, '中南大学',           2, $changsha, 1, 24, 2, ['school_id' => 3002, 'city_by' => $csUser]],
            [$e3, '湖南工业大学',       2, $zhuzhou, 0, 22, 2, ['school_id' => 3003]],
        ];

        foreach ($plan as $idx => [$event, $unit, $type, $region, $status, $pCount, $cCount, $extra]) {
            $registration = $this->makeRegistration($event, $unit, $type, $region, $status, $pCount, $cCount, $extra, $idx);

            $this->makePlayers($registration, $pCount, $idx);
            $this->makeCoaches($registration, $cCount, $idx);
            $this->makeAuditRecords($registration, $status, $extra, $csUser, $provinceUser);
        }

        // ── 4. 盖章件 / 学籍材料（用于「查看扫描件」「下载资料」联调）──
        $passed = Registration::where('unit_name', '长沙市代表队')->first();
        if ($passed) {
            $this->makeAttachment($passed, 'seal', '长沙市代表队_报名表盖章件.png', $this->pngBytes());
            $this->makeAttachment($passed, 'enrollment', '长沙市代表队_学籍验证材料.txt',
                "学籍验证材料（演示文件）\n单位：长沙市代表队\n共 18 名球员，学籍均已核验。\n");
        }

        // ── 5. 操作日志（用于「报名日志管理」联调）──
        $this->makeLogs($provinceUser, $csUser, $zzUser);

        $this->command->info('演示数据就绪');
        $this->command->table(['对象', '数量'], [
            ['账号 users',        User::count()],
            ['赛事 events',       Event::count()],
            ['报名 registrations', Registration::count()],
            ['球员 players',      RegistrationPlayer::count()],
            ['教练 coaches',      RegistrationCoach::count()],
            ['附件 registration_files', RegistrationFile::count()],
            ['审核记录 audit_records', AuditRecord::count()],
            ['操作日志 operation_logs', OperationLog::count()],
        ]);
    }

    private function makeUser(string $username, string $realName, int $role, ?int $regionId): User
    {
        return User::updateOrCreate(
            ['username' => $username],
            [
                'password'  => Hash::make('123456'),
                'real_name' => $realName,
                'phone'     => '138' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT),
                'role'      => $role,
                'region_id' => $regionId,
                'status'    => 1,
                'remark'    => '演示账号',
            ]
        );
    }

    private function makeEvent(string $name, int $year, int $category): Event
    {
        return Event::updateOrCreate(
            ['name' => $name],
            [
                'year'           => $year,
                'category'       => $category,
                'register_start' => now()->subDays(20),
                'register_end'   => now()->addDays(10),
                'match_start'    => now()->addDays(30),
                'match_end'      => now()->addDays(40),
                'venue'          => '湖南省体育中心',
                'description'    => '演示赛事数据',
                'status'         => 2,
            ]
        );
    }

    private function makeRegistration(
        Event $event, string $unit, int $type, Region $region, int $status,
        int $pCount, int $cCount, array $extra, int $idx
    ): Registration {
        $payload = [
            'event_id'      => $event->id,
            'team_id'       => $extra['team_id'] ?? null,
            'school_id'     => $extra['school_id'] ?? null,
            'region_id'     => $region->id,
            'type'          => $type,
            'category'      => $event->category,
            'unit_name'     => $unit,
            'contact_name'  => $this->coachNames[$idx % count($this->coachNames)],
            'contact_phone' => '139' . str_pad((string) (10000000 + $idx), 8, '0', STR_PAD_LEFT),
            'player_count'  => $pCount,
            'coach_count'   => $cCount,
            'audit_status'  => $status,
            'reject_reason' => $extra['reject'] ?? null,
        ];

        if (! empty($extra['city_by'])) {
            $payload['city_audited_by'] = $extra['city_by']->id;
            $payload['city_audited_at'] = now()->subDays(5);
        }
        if (! empty($extra['province_by'])) {
            $payload['province_audited_by'] = $extra['province_by']->id;
            $payload['province_audited_at'] = now()->subDays(2);
        }
        if ($status === 3 && empty($extra['reject'])) {
            $payload['reject_reason'] = '报名表盖章不清晰，请重新上传';
        }

        return Registration::updateOrCreate(
            ['event_id' => $event->id, 'unit_name' => $unit],
            $payload
        );
    }

    private function makePlayers(Registration $reg, int $count, int $idx): void
    {
        if ($reg->players()->exists()) {
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            $n = $idx * 100 + $i;
            $hasAvatar = $i < 3;
            $photoUrl  = $hasAvatar ? $this->makeAvatar($n) : null;

            RegistrationPlayer::create([
                'registration_id' => $reg->id,
                'name'            => $this->playerNames[$n % count($this->playerNames)],
                'id_card'         => sprintf('4301%014d', $n + 1),
                'jersey_no'       => $i + 1,
                'position'        => $this->positions[$i % 4],
                'phone'           => '137' . str_pad((string) (20000000 + $n), 8, '0', STR_PAD_LEFT),
                'photo_url'       => $photoUrl,
                'age'             => 15 + ($i % 5),
                'gender'          => '男',
                'audit_status'    => 0,
            ]);
        }
    }

    private function makeCoaches(Registration $reg, int $count, int $idx): void
    {
        if ($reg->coaches()->exists()) {
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            RegistrationCoach::create([
                'registration_id' => $reg->id,
                'name'            => $this->coachNames[($idx + $i) % count($this->coachNames)],
                'id_card'         => sprintf('4302%014d', $idx * 10 + $i + 1),
                'phone'           => '136' . str_pad((string) (30000000 + $idx * 10 + $i), 8, '0', STR_PAD_LEFT),
                'certificate_no'  => 'COACH-' . str_pad((string) ($idx * 10 + $i + 1), 6, '0', STR_PAD_LEFT),
                'role'            => $i === 0 ? '主教练' : '助理教练',
            ]);
        }
    }

    private function makeAuditRecords(
        Registration $reg, int $status, array $extra, User $csUser, User $provinceUser
    ): void {
        if ($reg->auditRecords()->exists()) {
            return;
        }

        if (in_array($status, [1, 2], true)) {
            AuditRecord::create([
                'auditable_type'  => Registration::class,
                'auditable_id'    => $reg->id,
                'registration_id' => $reg->id,
                'from_status'     => 0,
                'to_status'       => 1,
                'action'          => 'approve',
                'auditor_id'      => ($extra['city_by'] ?? $csUser)->id,
                'auditor_name'    => ($extra['city_by'] ?? $csUser)->real_name,
                'audit_level'     => 1,
            ]);
        }

        if ($status === 2) {
            AuditRecord::create([
                'auditable_type'  => Registration::class,
                'auditable_id'    => $reg->id,
                'registration_id' => $reg->id,
                'from_status'     => 1,
                'to_status'       => 2,
                'action'          => 'approve',
                'auditor_id'      => ($extra['province_by'] ?? $provinceUser)->id,
                'auditor_name'    => ($extra['province_by'] ?? $provinceUser)->real_name,
                'audit_level'     => 2,
            ]);
        }

        if ($status === 3) {
            AuditRecord::create([
                'auditable_type'  => Registration::class,
                'auditable_id'    => $reg->id,
                'registration_id' => $reg->id,
                'from_status'     => 0,
                'to_status'       => 3,
                'action'          => 'reject',
                'reason'          => $extra['reject'] ?? '报名表盖章不清晰，请重新上传',
                'auditor_id'      => ($extra['city_by'] ?? $csUser)->id,
                'auditor_name'    => ($extra['city_by'] ?? $csUser)->real_name,
                'audit_level'     => 1,
            ]);
        }
    }

    private function makeAttachment(Registration $reg, string $type, string $fileName, string $content): void
    {
        $path = "demo/{$type}/{$fileName}";
        Storage::disk('public')->put($path, $content);

        $file = File::updateOrCreate(
            ['storage_path' => $path],
            [
                'original_name' => $fileName,
                'url'           => Storage::disk('public')->url($path),
                'mime_type'     => $type === 'seal' ? 'image/png' : 'text/plain',
                'size'          => strlen($content),
                'file_type'     => $type,
            ]
        );

        RegistrationFile::firstOrCreate(
            ['registration_id' => $reg->id, 'file_type' => $type],
            ['file_id' => $file->id, 'file_name' => $fileName]
        );
    }

    private function makeAvatar(int $n): string
    {
        $path = "demo/avatar/player_{$n}.png";
        if (! Storage::disk('public')->exists($path)) {
            Storage::disk('public')->put($path, $this->pngBytes());
        }
        return Storage::disk('public')->url($path);
    }

    private function makeLogs(User $provinceUser, User $csUser, User $zzUser): void
    {
        if (OperationLog::exists()) {
            return;
        }

        $rows = [
            [$csUser->id, 'registration', 'approve',   '长沙市第一中学'],
            [$csUser->id, 'registration', 'reject',    '常德市代表队'],
            [$zzUser->id, 'registration', 'approve',   '株洲市代表队'],
            [$provinceUser->id, 'registration', 'approve', '长沙市代表队'],
            [$provinceUser->id, 'account', 'reset_password', 'city_zhuzhou'],
            [$provinceUser->id, 'registration', 'export', '报名列表导出'],
        ];

        foreach ($rows as $i => [$userId, $module, $action, $target]) {
            OperationLog::create([
                'user_id'     => $userId,
                'module'      => $module,
                'action'      => $action,
                'target_type' => Registration::class,
                'target_id'   => $i + 1,
                'ip'          => '127.0.0.1',
                'trace_id'    => 'demo-trace-' . ($i + 1),
                'detail'      => ['target_name' => $target],
            ]);
        }
    }

    /** 1x1 透明 PNG，用于演示附件/头像 */
    private function pngBytes(): string
    {
        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );
    }
}
