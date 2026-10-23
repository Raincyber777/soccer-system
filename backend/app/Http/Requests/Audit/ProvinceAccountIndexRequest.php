<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 省级审核端 — 报名账号列表查询参数
 */
class ProvinceAccountIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'keyword'  => ['nullable', 'string', 'max:100'],
            'role'     => ['nullable', 'integer', 'in:1,2,3,4,5,6,9'],
            'status'   => ['nullable', 'integer', 'in:0,1'],
            'pageNum'  => ['nullable', 'integer', 'min:1'],
            'pageSize' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'keyword'  => '关键字',
            'role'     => '角色',
            'status'   => '状态',
            'pageNum'  => '页码',
            'pageSize' => '每页数量',
        ];
    }
}
