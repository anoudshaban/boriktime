<?php

namespace App\Support;

use App\Models\Setting;
use Carbon\CarbonImmutable;

/**
 * Booking rules set from the dashboard: opening and last booking time, slot
 * length, party size and how far ahead guests may book. Times after midnight
 * (e.g. closing at 01:00) belong to the evening of the chosen date.
 */
class ReservationRules
{
    public const TIMEZONE = 'Asia/Amman';

    /** Bookings need at least this much notice. */
    public const NOTICE_MINUTES = 30;

    public const DAYS_AHEAD = 60;

    /** @param  array<string, mixed>  $settings */
    public function __construct(private array $settings = []) {}

    public static function current(): self
    {
        return new self(Setting::allWithDefaults());
    }

    public function enabled(): bool
    {
        return (string) ($this->settings['reservations_enabled'] ?? '1') !== '0';
    }

    public function maxGuests(): int
    {
        return max(1, (int) ($this->settings['reservation_max_guests'] ?? 20));
    }

    /**
     * Every bookable time of day, in order (wrapping past midnight when the last slot is earlier than the first).
     *
     * @return list<string>
     */
    public function slots(): array
    {
        $open = $this->minutes($this->settings['reservation_open'] ?? null, 12 * 60);
        $last = $this->minutes($this->settings['reservation_last'] ?? null, 23 * 60);
        $step = max(15, (int) ($this->settings['reservation_interval'] ?? 30));

        if ($last < $open) {
            $last += 24 * 60;
        }

        $slots = [];
        for ($m = $open; $m <= $last; $m += $step) {
            $slots[] = sprintf('%02d:%02d', intdiv($m % 1440, 60), $m % 60);
        }

        return $slots;
    }

    /** Why a date and time can't be booked, or null when it can. */
    public function problem(string $date, string $time): ?string
    {
        if (! in_array($time, $this->slots(), true)) {
            return 'Please choose one of the listed times.';
        }

        $now = CarbonImmutable::now(self::TIMEZONE);
        $day = CarbonImmutable::createFromFormat('Y-m-d', $date, self::TIMEZONE)->startOfDay();

        if ($day->gt($now->startOfDay()->addDays(self::DAYS_AHEAD))) {
            return 'Bookings open up to '.self::DAYS_AHEAD.' days ahead.';
        }

        if ($this->startsAt($date, $time)->lt($now->addMinutes(self::NOTICE_MINUTES))) {
            return 'This time has already passed — please pick a later one.';
        }

        return null;
    }

    public function startsAt(string $date, string $time): CarbonImmutable
    {
        $at = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$date} {$time}", self::TIMEZONE);
        $open = $this->minutes($this->settings['reservation_open'] ?? null, 12 * 60);

        // A slot earlier than opening time is after midnight of the same evening.
        return $this->minutes($time, 0) < $open ? $at->addDay() : $at;
    }

    private function minutes(mixed $value, int $fallback): int
    {
        if (! is_string($value) || ! preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $value, $m)) {
            return $fallback;
        }

        return (int) $m[1] * 60 + (int) $m[2];
    }
}
