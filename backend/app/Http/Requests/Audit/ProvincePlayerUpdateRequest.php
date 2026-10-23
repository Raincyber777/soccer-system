<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class ProvincePlayerUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['nullable', 'string', 'max:32'],
            'id_card'  => ['nullable', 'string', 'size:18'],
            'phone'    => ['nullable', 'string', 'max:20'],
            'position' => ['nullable', 'string', 'max:16'],
            'jersey_no' => ['nullable', 'integer'],
            'age'      => ['nullable', 'integer', 'min:5', 'max:30'],
            'gender'   => ['nullable', 'string', 'in:男,女'],
            'audit_remark' => ['nullable', 'string', 'max:255'],
        ];
    }
}
