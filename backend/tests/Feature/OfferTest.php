<?php

namespace Tests\Feature;

use App\Models\Offer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfferTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_an_offer_with_dishes_and_photo(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());
        $dishes = Product::factory()->count(2)->create();

        $id = $this->postJson('/api/admin/offers', [
            'title_en' => 'Weekend Breakfast',
            'title_ar' => 'فطور نهاية الأسبوع',
            'badge_en' => 'Weekend',
            'price' => 12,
            'old_price' => 14,
            'product_ids' => $dishes->pluck('id')->all(),
        ])->assertCreated()->assertJsonCount(2, 'data.product_ids')->json('data.id');

        $this->post("/api/admin/offers/{$id}/image", ['image' => UploadedFile::fake()->image('offer.jpg', 1600, 900)], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.is_running', true);

        $this->getJson('/api/menu')
            ->assertJsonCount(1, 'offers')
            ->assertJsonPath('offers.0.title.en', 'Weekend Breakfast')
            ->assertJsonPath('offers.0.price', 12)
            ->assertJsonCount(2, 'offers.0.product_ids');
    }

    public function test_only_running_offers_are_public(): void
    {
        Offer::factory()->create(['title_en' => 'Now']);
        Offer::factory()->create(['title_en' => 'Ended', 'ends_at' => today()->subDay()]);
        Offer::factory()->create(['title_en' => 'Later', 'starts_at' => today()->addDay()]);
        Offer::factory()->create(['title_en' => 'Off', 'is_active' => false]);
        Offer::factory()->create(['title_en' => 'Last day', 'ends_at' => today()]);

        $titles = collect($this->getJson('/api/menu')->json('offers'))->pluck('title.en')->sort()->values()->all();

        $this->assertSame(['Last day', 'Now'], $titles);
    }

    public function test_offer_dates_are_validated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/admin/offers', [
            'title_en' => 'X', 'title_ar' => 'س',
            'starts_at' => '2026-10-20', 'ends_at' => '2026-10-10',
        ])->assertUnprocessable()->assertJsonValidationErrors('ends_at');
    }

    public function test_dish_offer_price_is_public(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $dish = Product::factory()->create(['price' => 5]);

        $this->putJson("/api/admin/products/{$dish->id}", ['sale_price' => 4])->assertOk()->assertJsonPath('data.sale_price', 4);

        $this->getJson('/api/menu')->assertJsonPath('groups.0.sections.0.products.0.sale_price', 4);
    }
}
