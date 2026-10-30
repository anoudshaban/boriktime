<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Support\Phone;
use App\Support\ReservationRules;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * A guest sends a delivery or pick-up order. It is saved here (as "new") just before
     * their WhatsApp opens with the same order. Prices come from the menu, not the phone.
     */
    public function store(Request $request): JsonResponse
    {
        $request->merge(['phone' => Phone::normalize($request->input('phone'))]);

        $data = $request->validate([
            'type' => ['required', Rule::in(Order::TYPES)],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', Phone::RULE],
            'address' => ['nullable', 'required_if:type,delivery', 'string', 'max:300'],
            'pickup_time' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
            'lang' => ['nullable', Rule::in(['en', 'ar'])],
            'items' => ['required', 'array', 'min:1', 'max:40'],
            'items.*.id' => ['required', 'integer'],
            'items.*.size' => ['nullable', 'integer', 'min:0'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
            // Hidden field real guests never fill; bots usually do.
            'website' => ['prohibited'],
        ], [
            'phone.regex' => Phone::message(),
            'address.required_if' => 'Please write your area and address.',
        ]);

        $settings = Setting::allWithDefaults();
        $delivery = $data['type'] === 'delivery';
        $flag = $delivery ? 'is_delivery' : 'is_pickup';

        if (! $this->open($settings[$delivery ? 'delivery_from' : 'pickup_from'] ?? null, $settings[$delivery ? 'delivery_until' : 'pickup_until'] ?? null)) {
            throw ValidationException::withMessages(['type' => $delivery ? 'Delivery is closed right now.' : 'Pick-up is closed right now.']);
        }

        $products = Product::query()
            ->whereIn('id', array_column($data['items'], 'id'))
            ->where('is_available', true)
            ->where($flag, true)
            ->get()
            ->keyBy('id');

        $items = [];
        foreach ($data['items'] as $line) {
            $product = $products->get($line['id']);
            $sizes = $product?->sizes ?? [];
            $size = isset($line['size']) ? ($sizes[$line['size']] ?? null) : null;

            if (! $product || ($sizes && ! $size) || (! $sizes && isset($line['size']))) {
                throw ValidationException::withMessages(['items' => $delivery
                    ? 'Some dishes are no longer available for delivery — please check your order.'
                    : 'Some dishes are no longer available for pick-up — please check your order.']);
            }

            $each = (float) ($size['price'] ?? $product->sale_price ?? $product->price);
            $items[] = [
                'id' => $product->id,
                'name_en' => $product->name_en,
                'name_ar' => $product->name_ar,
                'size_en' => $size['en'] ?? null,
                'size_ar' => $size['ar'] ?? null,
                'qty' => $line['qty'],
                'price' => $each,
                'total' => round($each * $line['qty'], 3),
            ];
        }

        $total = round(array_sum(array_column($items, 'total')), 3);
        $min = $settings['delivery_min'] ?? null;
        if ($delivery && is_numeric($min) && $total < (float) $min) {
            throw ValidationException::withMessages(['items' => "The minimum order for delivery is {$min}."]);
        }

        $order = Order::create([
            'type' => $data['type'],
            'status' => 'new',
            'name' => $data['name'],
            'phone' => $data['phone'],
            'address' => $delivery ? $data['address'] : null,
            'pickup_time' => $delivery ? null : ($data['pickup_time'] ?? null),
            'notes' => $data['notes'] ?? null,
            'items' => $items,
            'total' => $total,
            'lang' => $data['lang'] ?? 'en',
        ]);

        return response()->json(['reference' => $order->reference(), 'total' => (float) $order->total], 201);
    }

    /** Within the hours (Amman time)? They may pass midnight; no hours set = always open. */
    private function open(?string $from, ?string $until): bool
    {
        if (! $from || ! $until) {
            return true;
        }

        $now = CarbonImmutable::now(ReservationRules::TIMEZONE)->format('H:i');

        return $from <= $until ? ($now >= $from && $now <= $until) : ($now >= $from || $now <= $until);
    }
}
