<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Support\StarterPhotos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StarterPhotosTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->dir = sys_get_temp_dir().'/starter-photos-'.uniqid();
        mkdir($this->dir);
        $image = UploadedFile::fake()->image('x.jpg', 20, 20);
        foreach (['dish-20', 'dish-21', 'dish-999', 'banner-salads', 'notes'] as $name) {
            copy($image->getRealPath(), "{$this->dir}/{$name}.webp");
        }
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir.'/*'));
        rmdir($this->dir);
        parent::tearDown();
    }

    public function test_photos_attach_to_dishes_and_sections_without_one(): void
    {
        $hummus = Product::factory()->create(['code' => 20]);
        $motabal = Product::factory()->create(['code' => 21, 'image_path' => 'products/owner.webp']);
        $salads = Category::factory()->create(['slug' => 'salads']);

        $stats = app(StarterPhotos::class)->attach(dir: $this->dir);

        $this->assertSame(['dishes' => 1, 'banners' => 1, 'skipped' => 2], $stats);
        Storage::disk('public')->assertExists($hummus->fresh()->image_path);
        Storage::disk('public')->assertExists($salads->fresh()->image_path);
        $this->assertSame('products/owner.webp', $motabal->fresh()->image_path, "the owner's own photo is kept");
    }

    public function test_force_replaces_existing_photos(): void
    {
        Storage::disk('public')->put('products/owner.webp', 'x');
        $motabal = Product::factory()->create(['code' => 21, 'image_path' => 'products/owner.webp']);

        app(StarterPhotos::class)->attach(force: true, dir: $this->dir);

        $this->assertNotSame('products/owner.webp', $motabal->fresh()->image_path);
        Storage::disk('public')->assertMissing('products/owner.webp');
    }
}
