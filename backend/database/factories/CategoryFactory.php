<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = Str::title(fake()->unique()->words(2, true));

        return [
            'slug' => Str::slug($name),
            'name_en' => $name,
            'name_ar' => 'قسم '.fake()->numberBetween(1, 999),
            'icon' => 'dish',
            'sort_order' => fake()->numberBetween(0, 50),
            'is_active' => true,
        ];
    }
}
