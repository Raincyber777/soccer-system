<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 省级审核端 — 报名日志列表查询参数
 */
class ProvinceLogIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'keyword'    => ['nullable', 'string', 'max:100'],
            'module'     => ['nullable', 'string', 'max:64'],
            'user_id'    => ['nullable', 'integer', 'min:1'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date'   => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'pageNum'    => ['nullable', 'integer', 'min:1'],
            'pageSize'   => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'keyword'    => '关键字',
            'module'     => '模块',
            'user_id'    => '操作人',
            'start_date' => '开始日期',
            'end_date'   => '结束日期',
            'pageNum'    => '页码',
            'pageSize'   => '每页数量',
        ];
    }
}
