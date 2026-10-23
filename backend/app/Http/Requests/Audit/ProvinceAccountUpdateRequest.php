<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class ProvinceAccountUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'real_name' => ['nullable', 'string', 'max:64'],
            'phone'     => ['nullable', 'string', 'max:20'],
            'role'      => ['nullable', 'integer', 'in:1,2,3,4,5,6,9'],
            'status'    => ['nullable', 'integer', 'in:0,1'],
            'org_id'    => ['nullable', 'integer'],
            'region_id' => ['nullable', 'integer'],
            'remark'    => ['nullable', 'string', 'max:255'],
        ];
    }
}
