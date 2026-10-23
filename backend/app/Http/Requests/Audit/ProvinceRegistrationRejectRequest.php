<?php

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class ProvinceRegistrationRejectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reject_reason' => ['required', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return ['reject_reason' => '驳回原因'];
    }
}
