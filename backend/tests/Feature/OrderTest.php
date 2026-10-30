<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Support\ReservationRules;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Date;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private Product $tray;

    private Product $pie;

    protected function setUp(): void
    {
        parent::setUp();

        // 2 Nov 2026, 15:10 in Amman.
        Date::setTestNow(CarbonImmutable::create(2026, 11, 2, 15, 10, 0, ReservationRules::TIMEZONE));

        $section = Category::factory()->create();
        $this->tray = Product::factory()->create([
            'category_id' => $section->id, 'name_en' => 'Cheese Borek', 'name_ar' => 'بوريك جبنة', 'is_delivery' => true, 'is_pickup' => true,
            'sizes' => [['en' => 'Small · 12 pcs', 'ar' => 'صغيرة', 'price' => 9], ['en' => 'Large · 40 pcs', 'ar' => 'كبيرة', 'price' => 28]],
        ]);
        $this->pie = Product::factory()->create(['category_id' => $section->id, 'name_en' => 'Zaatar Pie', 'name_ar' => 'فطيرة زعتر', 'price' => 3, 'is_delivery' => true, 'is_pickup' => false]);
    }

    protected function tearDown(): void
    {
        Date::setTestNow();
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function order(array $overrides = []): array
    {
        return [
            'type' => 'delivery',
            'name' => 'Laith',
            'phone' => '079 123 4567',
            'address' => 'Abdoun, Street 5',
            'lang' => 'ar',
            'items' => [['id' => $this->tray->id, 'size' => 1, 'qty' => 2], ['id' => $this->pie->id, 'qty' => 3]],
            ...$overrides,
        ];
    }

    public function test_a_delivery_order_is_saved_with_menu_prices(): void
    {
        $this->postJson('/api/orders', $this->order())
            ->assertCreated()
            ->assertJson(['reference' => 'OR-0001', 'total' => 65]);

        $order = Order::sole();
        $this->assertSame(['delivery', 'new', '0791234567', '65.000'], [$order->type, $order->status, $order->phone, $order->total]);
        $this->assertEquals(['Large · 40 pcs', 2, 28, 56], [$order->items[0]['size_en'], $order->items[0]['qty'], $order->items[0]['price'], $order->items[0]['total']]);
    }

    public function test_pick_up_orders_need_no_address_and_only_take_pick_up_dishes(): void
    {
        $this->postJson('/api/orders', $this->order(['type' => 'pickup', 'address' => null, 'pickup_time' => '19:30', 'items' => [['id' => $this->tray->id, 'size' => 0, 'qty' => 1]]]))
            ->assertCreated()->assertJson(['total' => 9]);
        $this->assertSame('19:30', Order::sole()->pickup_time);

        // The pie is delivery-only.
        $this->postJson('/api/orders', $this->order(['type' => 'pickup', 'items' => [['id' => $this->pie->id, 'qty' => 1]]]))->assertJsonValidationErrors('items');
    }

    public function test_orders_are_checked(): void
    {
        $this->postJson('/api/orders', $this->order(['phone' => '07912345']))->assertJsonValidationErrors('phone');
        $this->postJson('/api/orders', $this->order(['address' => '']))->assertJsonValidationErrors('address');
        $this->postJson('/api/orders', $this->order(['items' => [['id' => $this->tray->id, 'qty' => 1]]]))->assertJsonValidationErrors('items');
        $this->postJson('/api/orders', $this->order(['items' => [['id' => $this->tray->id, 'size' => 9, 'qty' => 1]]]))->assertJsonValidationErrors('items');
        $this->postJson('/api/orders', $this->order(['website' => 'spam.example']))->assertJsonValidationErrors('website');

        Setting::putMany(['delivery_min' => '100']);
        $this->postJson('/api/orders', $this->order())->assertJsonValidationErrors('items');

        Setting::putMany(['delivery_min' => null, 'delivery_from' => '18:00', 'delivery_until' => '23:00']);
        $this->postJson('/api/orders', $this->order())->assertJsonValidationErrors('type');

        $this->assertSame(0, Order::count());
    }

    public function test_admin_sees_the_month_with_totals_top_dishes_and_a_csv(): void
    {
        $this->postJson('/api/orders', $this->order())->assertCreated();
        $this->postJson('/api/orders', $this->order(['type' => 'pickup', 'address' => null, 'items' => [['id' => $this->tray->id, 'size' => 1, 'qty' => 1]]]))->assertCreated();
        $cancelled = Order::create(['type' => 'delivery', 'status' => 'cancelled', 'name' => 'X', 'phone' => '0790000000', 'items' => [], 'total' => 99]);
        Order::create(['type' => 'delivery', 'name' => 'Old', 'phone' => '0790000000', 'items' => [], 'total' => 5])->forceFill(['created_at' => '2026-10-15 10:00:00'])->save();

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/orders/pending')->assertExactJson(['new' => 3]);

        $this->getJson('/api/admin/orders?month=2026-11')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('summary.delivery', ['orders' => 1, 'total' => 65])
            ->assertJsonPath('summary.pickup', ['orders' => 1, 'total' => 28])
            ->assertJsonPath('summary.all.orders', 2)
            ->assertJsonPath('top.0.name_en', 'Cheese Borek')
            ->assertJsonPath('top.0.qty', 3);

        $this->getJson('/api/admin/orders?month=2026-10')->assertJsonCount(1, 'data');

        $id = Order::query()->where('type', 'pickup')->value('id');
        $this->putJson("/api/admin/orders/{$id}", ['status' => 'done', 'admin_note' => 'Paid'])->assertOk()->assertJsonPath('status', 'done');
        $this->putJson("/api/admin/orders/{$id}", ['status' => 'eaten'])->assertJsonValidationErrors('status');

        $csv = $this->get('/api/admin/orders/export?month=2026-11')->assertOk()->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $this->assertStringContainsString('2 × Cheese Borek (Large · 40 pcs); 3 × Zaatar Pie', $csv);
        $this->assertStringContainsString('As soon as possible', $csv);

        $this->deleteJson("/api/admin/orders/{$cancelled->id}")->assertNoContent();
        $this->assertSame(3, Order::count());
    }

    public function test_order_admin_needs_a_login(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->get('/api/admin/orders/export', ['Accept' => 'application/json'])->assertUnauthorized();
    }
}
