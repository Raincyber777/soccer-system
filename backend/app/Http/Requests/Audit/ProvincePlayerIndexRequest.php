<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 省级审核端 — 球员列表查询参数
 */
class ProvincePlayerIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'keyword'         => ['nullable', 'string', 'max:100'],
            'registration_id' => ['nullable', 'integer', 'min:1'],
            'audit_status'    => ['nullable', 'integer', 'in:0,1'],
            'pageNum'         => ['nullable', 'integer', 'min:1'],
            'pageSize'        => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'keyword'         => '关键字',
            'registration_id' => '报名ID',
            'audit_status'    => '状态',
            'pageNum'         => '页码',
            'pageSize'        => '每页数量',
        ];
    }
}
