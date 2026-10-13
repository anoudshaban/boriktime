<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_a_token_for_valid_credentials(): void
    {
        User::factory()->create(['email' => 'chef@borektime.com', 'password' => 'secret-pass']);

        $token = $this->postJson('/api/auth/login', ['email' => 'chef@borektime.com', 'password' => 'secret-pass'])
            ->assertOk()
            ->json('token');

        $this->withToken($token)->getJson('/api/auth/me')->assertOk()->assertJsonPath('email', 'chef@borektime.com');
    }

    public function test_login_rejects_a_wrong_password(): void
    {
        User::factory()->create(['email' => 'chef@borektime.com', 'password' => 'secret-pass']);

        $this->postJson('/api/auth/login', ['email' => 'chef@borektime.com', 'password' => 'nope'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_admin_routes_require_authentication(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();
        $this->postJson('/api/admin/categories', [])->assertUnauthorized();
    }

    public function test_admin_can_create_update_and_delete_a_product(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $category = Category::factory()->create();

        $id = $this->postJson('/api/admin/products', [
            'category_id' => $category->id,
            'name_en' => 'Pistachio Börek',
            'name_ar' => 'بوريك بالفستق',
            'price' => 3.75,
            'tags' => ['new', 'nuts'],
        ])->assertCreated()->json('data.id');

        $this->putJson("/api/admin/products/{$id}", ['price' => 4, 'is_available' => false])
            ->assertOk()
            ->assertJsonPath('data.price', 4)
            ->assertJsonPath('data.is_available', false);

        $this->getJson('/api/menu')->assertJsonCount(0, 'groups');

        $this->deleteJson("/api/admin/products/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('products', ['id' => $id]);
    }

    public function test_product_tags_are_validated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/admin/products', [
            'category_id' => Category::factory()->create()->id,
            'name_en' => 'X', 'name_ar' => 'س', 'price' => 1,
            'tags' => ['not-a-tag'],
        ])->assertUnprocessable()->assertJsonValidationErrors('tags.0');
    }

    public function test_admin_can_upload_a_product_photo(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());
        $product = Product::factory()->create();

        $url = $this->post("/api/admin/products/{$product->id}/image", [
            'image' => UploadedFile::fake()->image('dish.jpg', 2400, 1600),
        ], ['Accept' => 'application/json'])->assertOk()->json('data.image');

        $this->assertNotNull($url);
        Storage::disk('public')->assertExists($product->fresh()->image_path);
        [$width] = getimagesizefromstring(Storage::disk('public')->get($product->fresh()->image_path));
        $this->assertSame(1200, $width);
    }

    public function test_categories_can_be_reordered(): void
    {
        Sanctum::actingAs(User::factory()->create());
        [$a, $b, $c] = Category::factory()->count(3)->create();

        $this->postJson('/api/admin/categories/reorder', ['ids' => [$c->id, $a->id, $b->id]])->assertNoContent();

        $this->assertSame([$c->id, $a->id, $b->id], Category::query()->ordered()->pluck('id')->all());
    }

    public function test_settings_can_be_updated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/admin/settings', ['phone' => '+962 7 9000 0000', 'instagram' => 'https://instagram.com/borektime'])
            ->assertOk()
            ->assertJsonPath('phone', '+962 7 9000 0000');

        $this->getJson('/api/menu')->assertJsonPath('settings.instagram', 'https://instagram.com/borektime');

        $this->putJson('/api/admin/settings', ['instagram' => 'not a url'])->assertUnprocessable();
    }
}
