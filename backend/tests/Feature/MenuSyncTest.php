<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Support\MenuImporter;
use App\Support\MenuSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MenuSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_latest_price_list_updates_adds_and_hides_dishes(): void
    {
        app(MenuImporter::class)->import(config('menu.source'));

        $stats = app(MenuSync::class)->sync(database_path('data/menu.json'));

        $this->assertSame(['updated' => 73, 'created' => 1, 'hidden' => 1], $stats);
        $this->assertSame('Jabal Alnour', Product::where('code', 19)->value('name_en'));
        $this->assertSame('0.750', Product::where('name_en', 'Water Small')->value('price'));
        $this->assertFalse((bool) Product::where('name_en', 'Arabian Coffee')->value('is_available'));

        $steak = Product::where('name_en', 'Hardal Steak')->firstOrFail();
        $this->assertSame('main-course', $steak->category->slug);
        $this->assertSame('14.000', $steak->price);

        $this->getJson('/api/menu')->assertOk()->assertJsonMissing(['name_en' => 'Arabian Coffee']);
    }

    public function test_clearing_photos_removes_files_and_links(): void
    {
        Storage::fake('public');
        app(MenuImporter::class)->import(config('menu.source'));

        Storage::disk('public')->put('products/a.webp', 'x');
        Storage::disk('public')->put('categories/b.webp', 'x');
        Product::query()->first()->update(['image_path' => 'products/a.webp', 'image_credit' => 'someone']);
        Category::query()->first()->update(['image_path' => 'categories/b.webp']);

        $this->assertSame(2, app(MenuSync::class)->clearPhotos());

        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame(0, Product::whereNotNull('image_path')->count());
        $this->assertSame(0, Category::whereNotNull('image_path')->count());
    }
}
