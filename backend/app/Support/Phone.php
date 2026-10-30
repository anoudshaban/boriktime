<?php

namespace App\Support;

/**
 * Guests' phone numbers on bookings and orders: a 10-digit Jordanian number such as
 * 0791234567. Arabic digits are accepted and spaces or dashes are dropped.
 */
class Phone
{
    public const RULE = 'regex:/^\d{10}$/';

    public static function normalize(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = strtr($value, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        ]);

        return preg_replace('/[\s\-()]/', '', $value);
    }

    public static function message(): string
    {
        return 'Phone number must be 10 digits, e.g. 0791234567.';
    }
}
