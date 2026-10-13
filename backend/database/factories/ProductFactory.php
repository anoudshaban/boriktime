<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'code' => fake()->numberBetween(1, 200),
            'name_en' => Str::title(fake()->unique()->words(3, true)),
            'name_ar' => 'طبق '.fake()->numberBetween(1, 999),
            'price' => fake()->randomFloat(2, 0.5, 15),
            'tags' => [],
            'is_featured' => false,
            'is_available' => true,
            'sort_order' => 0,
        ];
    }

    public function unavailable(): static
    {
        return $this->state(['is_available' => false]);
    }
}
