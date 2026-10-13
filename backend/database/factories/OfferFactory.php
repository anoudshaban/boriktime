<?php

namespace Database\Factories;

use App\Models\Offer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Offer>
 */
class OfferFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title_en' => 'Börek & Tea Morning',
            'title_ar' => 'صباح البوريك والشاي',
            'price' => 3,
            'old_price' => 4,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
