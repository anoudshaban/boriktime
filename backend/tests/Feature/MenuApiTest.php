<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Support\MenuCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_menu_lists_active_categories_with_available_products(): void
    {
        $visible = Category::factory()->create(['sort_order' => 1]);
        $hidden = Category::factory()->create(['is_active' => false]);
        $empty = Category::factory()->create();

        Product::factory()->for($visible)->create(['name_en' => 'Doner Borek', 'price' => 4.5]);
        Product::factory()->for($visible)->unavailable()->create(['name_en' => 'Sold Out']);
        Product::factory()->for($hidden)->create();
        Product::factory()->for($empty)->unavailable()->create();

        $response = $this->getJson('/api/menu')->assertOk();

        $response->assertJsonCount(1, 'categories')
            ->assertJsonPath('categories.0.id', $visible->id)
            ->assertJsonCount(1, 'categories.0.products')
            ->assertJsonPath('categories.0.products.0.name.en', 'Doner Borek')
            ->assertJsonPath('categories.0.products.0.price', 4.5)
            ->assertJsonPath('settings.currency_en', 'JOD');
    }

    public function test_cached_menu_contains_only_plain_data(): void
    {
        Product::factory()->create();

        $menu = MenuCache::get();

        // Persistent cache stores unserialize without allowing classes.
        $this->assertSame($menu, unserialize(serialize($menu), ['allowed_classes' => false]));
        $this->assertIsArray($menu['categories'][0]['products']);
    }

    public function test_menu_supports_etag_revalidation(): void
    {
        Product::factory()->create();

        $etag = $this->getJson('/api/menu')->assertOk()->headers->get('ETag');

        $this->getJson('/api/menu', ['If-None-Match' => $etag])->assertStatus(304);
    }

    public function test_menu_cache_refreshes_when_a_product_changes(): void
    {
        $product = Product::factory()->create(['price' => 2]);
        $before = $this->getJson('/api/menu')->json('version');

        $product->update(['price' => 2.5]);

        $response = $this->getJson('/api/menu');
        $this->assertNotSame($before, $response->json('version'));
        $response->assertJsonPath('categories.0.products.0.price', 2.5);
    }
}
