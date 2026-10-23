<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * 行政区划种子 — 最简版，可按需扩展
 */
class RegionSeeder extends Seeder
{
    public function run(): void
    {
        // 示例：湖南省 + 14 个市州
        $provinceId = DB::table('regions')->insertGetId([
            'parent_id'  => 0,
            'code'       => '430000',
            'name'       => '湖南省',
            'level'      => 1,
            'sort'       => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $cities = [
            ['code' => '430100', 'name' => '长沙市'],
            ['code' => '430200', 'name' => '株洲市'],
            ['code' => '430300', 'name' => '湘潭市'],
            ['code' => '430400', 'name' => '衡阳市'],
            ['code' => '430500', 'name' => '邵阳市'],
            ['code' => '430600', 'name' => '岳阳市'],
            ['code' => '430700', 'name' => '常德市'],
            ['code' => '430800', 'name' => '张家界市'],
            ['code' => '430900', 'name' => '益阳市'],
            ['code' => '431000', 'name' => '郴州市'],
            ['code' => '431100', 'name' => '永州市'],
            ['code' => '431200', 'name' => '怀化市'],
            ['code' => '431300', 'name' => '娄底市'],
            ['code' => '433100', 'name' => '湘西州'],
        ];

        $now = now();
        foreach ($cities as $idx => $city) {
            DB::table('regions')->insert([
                'parent_id'  => $provinceId,
                'code'       => $city['code'],
                'name'       => $city['name'],
                'level'      => 2,
                'sort'       => $idx + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}
