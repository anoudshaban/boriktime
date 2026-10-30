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

        $this->assertSame(['updated' => 64, 'created' => 17, 'hidden' => 10], $stats);
        $this->assertSame(80, Product::where('is_available', true)->count());
        $this->assertFalse((bool) Product::where('name_en', 'Breakfast / 2 Persons')->value('is_available'));

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
            ->assertJsonMissing(['slug' => 'fatteh'])
            ->assertJsonMissing(['slug' => 'breakfast']);
    }

    public function test_borek_trays_get_their_own_kitchen_tab_with_three_sizes(): void
    {
        app(MenuImporter::class)->import(config('menu.source'));
        app(MenuSync::class)->sync(database_path('data/menu.json'));

        // The new tab sits right after Bakery in the Kitchen.
        $kitchen = Category::where('slug', 'kitchen')->firstOrFail();
        $this->assertSame(
            ['breakfast', 'bakery', 'borek-trays', 'salads'],
            Category::where('parent_id', $kitchen->id)->orderBy('sort_order')->limit(4)->pluck('slug')->all(),
        );

        $cheese = Product::where('name_en', 'Cheese Borek')->firstOrFail();
        $this->assertSame('borek-trays', $cheese->category->slug);
        $this->assertSame('9.000', $cheese->price);
        $this->assertEquals([
            ['en' => 'Small · 12 pcs', 'ar' => 'صغيرة · 12 قطعة', 'price' => 9.0],
            ['en' => 'Medium · 24 pcs', 'ar' => 'وسط · 24 قطعة', 'price' => 18.0],
            ['en' => 'Large · 40 pcs', 'ar' => 'كبيرة · 40 قطعة', 'price' => 28.0],
        ], $cheese->sizes);
        $this->assertSame(13, $cheese->category->products()->where('is_available', true)->count());

        // A dish with one price has no sizes; syncing again changes nothing.
        $this->assertNull(Product::where('name_en', 'Zaatar Pie')->value('sizes'));
        $this->assertSame(['updated' => 81, 'created' => 0, 'hidden' => 0], app(MenuSync::class)->sync(database_path('data/menu.json')));

        $this->getJson('/api/menu')->assertOk()->assertJsonFragment(['slug' => 'borek-trays'])
            ->assertJsonFragment(['en' => 'Large · 40 pcs', 'ar' => 'كبيرة · 40 قطعة', 'price' => 28]);
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
