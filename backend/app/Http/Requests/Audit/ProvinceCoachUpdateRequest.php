<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class ProvinceCoachUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'            => ['nullable', 'string', 'max:32'],
            'id_card'         => ['nullable', 'string', 'size:18'],
            'phone'           => ['nullable', 'string', 'max:20'],
            'certificate_no'  => ['nullable', 'string', 'max:64'],
            'role'            => ['nullable', 'string', 'max:16'],
        ];
    }
}
