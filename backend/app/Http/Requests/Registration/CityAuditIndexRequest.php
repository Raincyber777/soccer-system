<?php

namespace App\Http\Requests\Registration;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 市州端 — 学校报名列表查询参数
 */
class CityAuditIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_id'     => ['nullable', 'integer'],
            'audit_status' => ['nullable', 'integer', 'in:0,1,2,3'],
            'category'     => ['nullable', 'integer', 'in:1,2,3'],
            'type'         => ['nullable', 'integer', 'in:1,2,3'],
            'keyword'      => ['nullable', 'string', 'max:100'],
            'pageNum'      => ['nullable', 'integer', 'min:1'],
            'pageSize'     => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'event_id'     => '赛事ID',
            'audit_status' => '审核状态',
            'category'     => '组别',
            'type'         => '报名类型',
            'keyword'      => '关键字',
            'pageNum'      => '页码',
            'pageSize'     => '每页数量',
        ];
    }
}
