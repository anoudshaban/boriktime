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

        $rules['name_en'] = ['sometimes', 'required', 'string', 'max:120'];
        $rules['name_ar'] = ['sometimes', 'required', 'string', 'max:120'];

        return $rules;
    }
}
