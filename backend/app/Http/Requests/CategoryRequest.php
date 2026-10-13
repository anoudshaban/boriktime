<?php

namespace App\Http\Requests;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->isMethod('post') && blank($this->input('slug')) && filled($this->input('name_en'))) {
            $this->merge(['slug' => Str::slug($this->input('name_en'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Category|null $category */
        $category = $this->route('category');
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'slug' => [$required, 'string', 'max:80', 'alpha_dash', Rule::unique('categories', 'slug')->ignore($category)],
            'name_en' => [$required, 'string', 'max:120'],
            'name_ar' => [$required, 'string', 'max:120'],
            'description_en' => ['nullable', 'string', 'max:255'],
            'description_ar' => ['nullable', 'string', 'max:255'],
            'icon' => ['sometimes', 'string', 'max:40'],
            'is_active' => ['sometimes', 'boolean'],
            // Only one level of nesting: a section's parent must itself be a group.
            'parent_id' => [
                'sometimes', 'nullable', 'integer',
                Rule::exists('categories', 'id')->whereNull('parent_id'),
                Rule::notIn(array_filter([$category?->id])),
            ],
        ];
    }
}
