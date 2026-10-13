<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
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
            'category_id' => [$required, 'integer', 'exists:categories,id'],
            'code' => ['nullable', 'integer', 'min:0', 'max:99999'],
            'name_en' => [$required, 'string', 'max:160'],
            'name_ar' => [$required, 'string', 'max:160'],
            'description_en' => ['nullable', 'string', 'max:1000'],
            'description_ar' => ['nullable', 'string', 'max:1000'],
            'price' => [$required, 'numeric', 'min:0', 'max:99999'],
            // Optional offer price shown with the regular price crossed out.
            'sale_price' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'calories' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', Rule::in(Product::TAGS)],
            'is_featured' => ['sometimes', 'boolean'],
            'is_available' => ['sometimes', 'boolean'],
        ];
    }
}
