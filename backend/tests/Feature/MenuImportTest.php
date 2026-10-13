<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\MenuImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MenuImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_restaurant_spreadsheet_imports_every_section_and_dish(): void
    {
        $stats = app(MenuImporter::class)->import(config('menu.source'));

        $this->assertSame(10, $stats['categories']);
        $this->assertSame(74, $stats['created']);

        $breakfast = Product::where('code', 1)->firstOrFail();
        $this->assertSame('Breakfast / 2 Persons', $breakfast->name_en);
        $this->assertStringContainsString('Shakshoka', $breakfast->description_en);
        $this->assertSame('14.000', $breakfast->price);

        $this->assertSame('المقبلات الباردة', Category::where('slug', 'cold-mezze')->value('name_ar'));
        $this->assertSame('0.600', Product::where('name_en', 'Water Small')->value('price'));
    }

    public function test_reimporting_keeps_admin_edits_and_updates_prices(): void
    {
        $importer = app(MenuImporter::class);
        $importer->import(config('menu.source'));

        $dish = Product::where('name_en', 'Iskandar Kebab')->firstOrFail();
        $dish->update(['price' => 99, 'description_en' => 'Written by the chef', 'image_path' => 'products/x.webp']);

        $stats = $importer->import(config('menu.source'));

        $this->assertSame(0, $stats['created']);
        $dish->refresh();
        $this->assertSame('10.000', $dish->price);
        $this->assertSame('Written by the chef', $dish->description_en);
        $this->assertSame('products/x.webp', $dish->image_path);
    }

    public function test_admin_can_upload_a_spreadsheet(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $file = new UploadedFile(config('menu.source'), 'menu.xlsx', null, null, true);

        $this->post('/api/admin/import', ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('created', 74);
    }
}
