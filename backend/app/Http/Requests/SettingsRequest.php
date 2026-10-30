<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Every configurable key is a short optional string; URLs are checked as URLs.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = [];

        foreach (array_keys(config('menu.default_settings')) as $key) {
            $rules[$key] = ['sometimes', 'nullable', 'string', 'max:1000'];
        }

        foreach (['instagram', 'facebook', 'map_url'] as $key) {
            $rules[$key][] = 'url:http,https';
        }

        $rules['reservations_enabled'] = ['sometimes', 'required', 'in:0,1'];
        $rules['reservation_open'] = ['sometimes', 'required', 'date_format:H:i'];
        $rules['reservation_last'] = ['sometimes', 'required', 'date_format:H:i'];
        $rules['reservation_interval'] = ['sometimes', 'required', 'in:15,30,60'];
        $rules['reservation_max_guests'] = ['sometimes', 'required', 'integer', 'min:1', 'max:200'];

        $rules['delivery_whatsapp'] = ['sometimes', 'nullable', 'string', 'max:30', 'regex:/^\+?[\d\s()-]{7,}$/'];
        $rules['delivery_min'] = ['sometimes', 'nullable', 'numeric', 'min:0', 'max:10000'];
        $rules['delivery_from'] = ['sometimes', 'nullable', 'date_format:H:i', 'required_with:delivery_until'];
        $rules['delivery_until'] = ['sometimes', 'nullable', 'date_format:H:i', 'required_with:delivery_from'];

        $rules['pickup_from'] = ['sometimes', 'nullable', 'date_format:H:i', 'required_with:pickup_until'];
        $rules['pickup_until'] = ['sometimes', 'nullable', 'date_format:H:i', 'required_with:pickup_from'];

        $rules['name_en'] = ['sometimes', 'required', 'string', 'max:120'];
        $rules['name_ar'] = ['sometimes', 'required', 'string', 'max:120'];

        return $rules;
    }
}
