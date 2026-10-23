<?php

namespace Database\Seeders;

use App\Models\Dict;
use Illuminate\Database\Seeder;

/**
 * 字典种子 — 三组共用同一份
 */
class DictSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $data = [
            // 报名组别
            ['type' => 'category', 'code' => '1', 'label' => '高校组', 'sort' => 1],
            ['type' => 'category', 'code' => '2', 'label' => '中学组', 'sort' => 2],
            ['type' => 'category', 'code' => '3', 'label' => '小学组', 'sort' => 3],

            // 审核状态
            ['type' => 'audit_status', 'code' => '0', 'label' => '待审核', 'sort' => 1],
            ['type' => 'audit_status', 'code' => '1', 'label' => '市级通过', 'sort' => 2],
            ['type' => 'audit_status', 'code' => '2', 'label' => '省级通过', 'sort' => 3],
            ['type' => 'audit_status', 'code' => '3', 'label' => '已驳回', 'sort' => 4],

            // 赛事状态
            ['type' => 'event_status', 'code' => '1', 'label' => '未开始', 'sort' => 1],
            ['type' => 'event_status', 'code' => '2', 'label' => '报名中', 'sort' => 2],
            ['type' => 'event_status', 'code' => '3', 'label' => '比赛中', 'sort' => 3],
            ['type' => 'event_status', 'code' => '4', 'label' => '已结束', 'sort' => 4],

            // 用户角色
            ['type' => 'user_role', 'code' => '1', 'label' => '省级', 'sort' => 1],
            ['type' => 'user_role', 'code' => '2', 'label' => '市州', 'sort' => 2],
            ['type' => 'user_role', 'code' => '3', 'label' => '球队', 'sort' => 3],
            ['type' => 'user_role', 'code' => '4', 'label' => '高校', 'sort' => 4],
            ['type' => 'user_role', 'code' => '5', 'label' => '运动员', 'sort' => 5],
            ['type' => 'user_role', 'code' => '6', 'label' => '教练员', 'sort' => 6],
            ['type' => 'user_role', 'code' => '9', 'label' => '管理员', 'sort' => 9],

            // 报名类型
            ['type' => 'registration_type', 'code' => '1', 'label' => '球队端', 'sort' => 1],
            ['type' => 'registration_type', 'code' => '2', 'label' => '高校端', 'sort' => 2],
            ['type' => 'registration_type', 'code' => '3', 'label' => '市州端', 'sort' => 3],

            // 位置
            ['type' => 'player_position', 'code' => 'GK', 'label' => '门将', 'sort' => 1],
            ['type' => 'player_position', 'code' => 'DF', 'label' => '后卫', 'sort' => 2],
            ['type' => 'player_position', 'code' => 'MF', 'label' => '中场', 'sort' => 3],
            ['type' => 'player_position', 'code' => 'FW', 'label' => '前锋', 'sort' => 4],
        ];

        foreach ($data as $item) {
            Dict::updateOrCreate(
                ['type' => $item['type'], 'code' => $item['code']],
                [
                    'label'    => $item['label'],
                    'sort'     => $item['sort'],
                    'status'   => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
