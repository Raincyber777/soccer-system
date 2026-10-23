<?php

namespace App\Http\Requests\Registration;

use Illuminate\Foundation\Http\FormRequest;

class CityAuditRejectRequest extends FormRequest
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
