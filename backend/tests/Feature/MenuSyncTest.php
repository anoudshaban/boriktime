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
        $kebbah = Product::where('name_en', 'Fried Kebbah 4 Pcs')->value('id');
        $akkawi = Product::where('name_en', 'Akkawi Cheese Pie')->value('id');

        $stats = app(MenuSync::class)->sync(database_path('data/menu.json'));

        $this->assertSame(['updated' => 64, 'created' => 4, 'hidden' => 10], $stats);
        $this->assertSame(68, Product::where('is_available', true)->count());

        // Renumbered dishes are matched by name, renamed ones by their old name.
        $this->assertSame(7, Product::find($akkawi)->code);
        $this->assertSame('Fried Kebbah 3 Pcs', Product::find($kebbah)->name_en);
        $this->assertSame('Zaatar Pie', Product::where('code', 5)->where('is_available', true)->value('name_en'));
        $this->assertSame('0.750', Product::where('name_en', 'Water Small')->value('price'));
        $this->assertFalse((bool) Product::where('name_en', 'Fattet Mozat')->value('is_available'));
        $this->assertTrue((bool) Product::where('name_en', 'Hardal Beef Steak with Fries')->value('is_featured'));

        $fatteh = Product::where('name_en', 'Fatteh Yalanji')->firstOrFail();
        $this->assertSame('hot-mezze', $fatteh->category->slug);
        $this->assertSame('7.000', $fatteh->price);

        $this->getJson('/api/menu')->assertOk()
            ->assertJsonMissing(['name_en' => 'Fattet Mozat'])
            ->assertJsonMissing(['slug' => 'fatteh']);
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
