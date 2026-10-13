<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OfferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title_en' => [$required, 'string', 'max:160'],
            'title_ar' => [$required, 'string', 'max:160'],
            'description_en' => ['nullable', 'string', 'max:1000'],
            'description_ar' => ['nullable', 'string', 'max:1000'],
            'badge_en' => ['nullable', 'string', 'max:40'],
            'badge_ar' => ['nullable', 'string', 'max:40'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'old_price' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
            'product_ids' => ['sometimes', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ];
    }
}
