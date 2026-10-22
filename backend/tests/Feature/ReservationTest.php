<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\Setting;
use App\Models\User;
use App\Support\ReservationRules;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // 22 Oct 2026, 15:10 in Amman.
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 10, 22, 15, 10, 0, ReservationRules::TIMEZONE));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function booking(array $overrides = []): array
    {
        return [
            'name' => 'Laith',
            'phone' => '+962 79 123 4567',
            'guests' => 4,
            'date' => '2026-10-22',
            'time' => '20:00',
            'occasion' => 'birthday',
            'notes' => 'A cake with candles please',
            'lang' => 'ar',
            ...$overrides,
        ];
    }

    public function test_a_guest_can_book_a_table(): void
    {
        $this->postJson('/api/reservations', $this->booking())
            ->assertCreated()
            ->assertJson(['reference' => 'BT-0001', 'guests' => 4, 'date' => '2026-10-22', 'time' => '20:00', 'status' => 'pending']);

        $this->assertDatabaseHas('reservations', ['name' => 'Laith', 'occasion' => 'birthday', 'lang' => 'ar', 'status' => 'pending']);
    }

    public function test_times_in_the_past_or_off_the_list_are_refused(): void
    {
        $this->postJson('/api/reservations', $this->booking(['time' => '15:00']))->assertJsonValidationErrors('time');
        $this->postJson('/api/reservations', $this->booking(['time' => '20:10']))->assertJsonValidationErrors('time');
        $this->postJson('/api/reservations', $this->booking(['date' => '2026-10-21']))->assertJsonValidationErrors('time');
        $this->postJson('/api/reservations', $this->booking(['date' => '2027-03-01']))->assertJsonValidationErrors('time');
    }

    public function test_party_size_contact_and_bots_are_checked(): void
    {
        $this->postJson('/api/reservations', $this->booking(['guests' => 21]))->assertJsonValidationErrors('guests');
        $this->postJson('/api/reservations', $this->booking(['phone' => 'call me']))->assertJsonValidationErrors('phone');
        $this->postJson('/api/reservations', $this->booking(['website' => 'spam.example']))->assertJsonValidationErrors('website');

        $this->assertSame(0, Reservation::count());
    }

    public function test_late_slots_after_midnight_and_closed_booking(): void
    {
        Setting::putMany(['reservation_open' => '18:00', 'reservation_last' => '01:00', 'reservation_interval' => '60']);

        $this->assertSame(['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00'], ReservationRules::current()->slots());
        $this->postJson('/api/reservations', $this->booking(['time' => '00:00']))->assertCreated();

        Setting::putMany(['reservations_enabled' => '0']);
        $this->postJson('/api/reservations', $this->booking(['time' => '21:00']))->assertJsonValidationErrors('date');
    }

    public function test_the_menu_shares_booking_settings(): void
    {
        $this->getJson('/api/menu')->assertOk()->assertJsonPath('settings.reservation_open', '12:00')->assertJsonPath('settings.reservations_enabled', '1');
    }

    public function test_admins_manage_bookings(): void
    {
        $this->getJson('/api/admin/reservations')->assertUnauthorized();

        $this->postJson('/api/reservations', $this->booking())->assertCreated();
        $this->postJson('/api/reservations', $this->booking(['date' => '2026-10-25', 'guests' => 2]))->assertCreated();
        Reservation::create([...$this->booking(['date' => '2026-10-01']), 'status' => 'seated']);

        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/admin/reservations')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.reference', 'BT-0001')
            ->assertJsonPath('counts.pending', 2)
            ->assertJsonPath('counts.today', 1)
            ->assertJsonPath('counts.today_guests', 4);

        $this->getJson('/api/admin/reservations?view=past')->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/reservations?view=today')->assertJsonCount(1, 'data');

        $this->putJson('/api/admin/reservations/1', ['status' => 'confirmed', 'admin_note' => 'Table 5'])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');
        $this->putJson('/api/admin/reservations/1', ['status' => 'maybe'])->assertJsonValidationErrors('status');

        $this->deleteJson('/api/admin/reservations/2')->assertNoContent();
        $this->assertSame(2, Reservation::count());
    }
}
