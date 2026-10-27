<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\ImageStore;
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

    public function test_large_phone_photos_are_accepted_and_bad_files_get_a_clear_message(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());
        $product = Product::factory()->create();
        $url = "/api/admin/products/{$product->id}/image";

        $this->post($url, ['image' => UploadedFile::fake()->image('phone.jpg', 400, 300)->size(15000)], ['Accept' => 'application/json'])
            ->assertOk();

        $this->post($url, ['image' => UploadedFile::fake()->image('huge.jpg', 400, 300)->size(25000)], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.image.0', ImageStore::messages('image')['image.max']);

        $this->post($url, ['image' => UploadedFile::fake()->create('photo.heic', 500, 'image/heic')], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.image.0', ImageStore::messages('image')['image.image']);
    }

    public function test_admin_can_upload_and_remove_a_dish_video(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());
        $product = Product::factory()->create();

        $url = $this->post("/api/admin/products/{$product->id}/video", [
            'video' => UploadedFile::fake()->create('loop.mp4', 500, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertOk()->json('data.video');

        $this->assertNotNull($url);
        $this->getJson('/api/menu')->assertJsonPath('groups.0.sections.0.products.0.video', $url);

        $this->deleteJson("/api/admin/products/{$product->id}/video")->assertOk()->assertJsonPath('data.video', null);
        $this->assertSame([], Storage::disk('public')->allFiles('videos'));

        $this->post("/api/admin/products/{$product->id}/video", ['video' => UploadedFile::fake()->create('x.pdf', 10)], ['Accept' => 'application/json'])
            ->assertUnprocessable();
    }

    public function test_categories_can_be_reordered(): void
    {
        Sanctum::actingAs(User::factory()->create());
        [$a, $b, $c] = Category::factory()->count(3)->create();

        $this->postJson('/api/admin/categories/reorder', ['ids' => [$c->id, $a->id, $b->id]])->assertNoContent();

        $this->assertSame([$c->id, $a->id, $b->id], Category::query()->ordered()->pluck('id')->all());
    }

    public function test_admin_can_change_password_with_current_password(): void
    {
        $user = User::factory()->create(['email' => 'chef@borektime.com', 'password' => 'old-password']);
        $token = $user->createToken('admin')->plainTextToken;

        $this->withToken($token)->putJson('/api/auth/me', [
            'current_password' => 'wrong',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');

        $this->withToken($token)->putJson('/api/auth/me', [
            'email' => 'owner@borektime.com',
            'current_password' => 'old-password',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ])->assertOk()->assertJsonPath('email', 'owner@borektime.com');

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/auth/login', ['email' => 'owner@borektime.com', 'password' => 'new-password-1'])->assertOk();
    }

    public function test_admin_can_upload_and_remove_a_logo(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());

        $url = $this->post('/api/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png', 800, 400)], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('logo_url');

        $this->assertNotNull($url);
        $this->getJson('/api/menu')->assertJsonPath('settings.logo_url', $url);

        $this->deleteJson('/api/admin/settings/logo')->assertOk()->assertJsonPath('logo_url', null);
        $this->assertSame([], Storage::disk('public')->allFiles('brand'));
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
