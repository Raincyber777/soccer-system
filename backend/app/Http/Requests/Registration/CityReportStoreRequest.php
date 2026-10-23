<?php

namespace App\Http\Requests\Registration;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * 市州报送请求
 */
class CityReportStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_id'        => ['required', 'integer', Rule::exists('events', 'id')],
            'category'        => ['required', 'integer', 'in:1,2,3'],
            'unit_name'       => ['required', 'string', 'max:128'],
            'contact_name'    => ['nullable', 'string', 'max:64'],
            'contact_phone'   => ['nullable', 'string', 'max:20'],
            'players'         => ['present', 'array'],
            'players.*.name'  => ['required', 'string', 'max:32'],
            'players.*.id_card' => ['required', 'string', 'size:18'],
            'players.*.jersey_no' => ['nullable', 'integer'],
            'players.*.position' => ['nullable', 'string', 'max:16'],
            'coaches'         => ['nullable', 'array'],
            'coaches.*.name'  => ['required', 'string', 'max:32'],
            'coaches.*.id_card' => ['nullable', 'string', 'size:18'],
            'coaches.*.role'  => ['nullable', 'string', 'max:16'],
        ];
    }

    public function attributes(): array
    {
        return [
            'event_id' => '赛事ID',
            'category' => '报名组别',
        ];
    }
}
