<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class ProvinceRegistrationIndexRequest extends FormRequest
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
            'region_id'    => ['nullable', 'integer'],
            'keyword'      => ['nullable', 'string', 'max:100'],
            'pageNum'      => ['nullable', 'integer', 'min:1'],
            'pageSize'     => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
