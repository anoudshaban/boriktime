<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\ReservationRules;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    /**
     * One month of orders (Amman time), newest first, with the month's numbers: orders
     * and money per delivery / pick-up and the best-selling dishes (cancelled ones left out).
     */
    public function index(Request $request): JsonResponse
    {
        $month = $this->month($request);
        $orders = $this->query($request, $month)->latest()->limit(1000)->get();
        $counted = $orders->where('status', '!=', 'cancelled');

        return response()->json([
            'data' => $orders->map->toAdminArray()->values(),
            'month' => $month->format('Y-m'),
            'summary' => [
                'delivery' => $this->totals($counted->where('type', 'delivery')),
                'pickup' => $this->totals($counted->where('type', 'pickup')),
                'all' => $this->totals($counted),
            ],
            'top' => $this->topDishes($counted),
            'counts' => ['new' => Order::query()->where('status', 'new')->count()],
        ]);
    }

    /** New orders waiting, for the sidebar badge and chime. */
    public function pending(): JsonResponse
    {
        return response()->json(['new' => Order::query()->where('status', 'new')->count()]);
    }

    public function update(Request $request, Order $order): JsonResponse
    {
        $order->update($request->validate([
            'status' => ['sometimes', Rule::in(Order::STATUSES)],
            'admin_note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]));

        return response()->json($order->toAdminArray());
    }

    public function destroy(Order $order): Response
    {
        $order->delete();

        return response()->noContent();
    }

    /** The month's orders as a CSV file Excel opens (UTF-8 with BOM so Arabic shows correctly). */
    public function export(Request $request): StreamedResponse
    {
        $month = $this->month($request);
        $orders = $this->query($request, $month)->oldest()->get();

        return response()->streamDownload(function () use ($orders) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Order', 'Date', 'Time', 'Type', 'Status', 'Name', 'Phone', 'Address / pick-up time', 'Dishes', 'Items', 'Total (JD)', 'Notes', 'Staff note']);
            foreach ($orders as $order) {
                $at = $order->created_at->setTimezone(ReservationRules::TIMEZONE);
                fputcsv($out, [
                    $order->reference(),
                    $at->format('Y-m-d'),
                    $at->format('H:i'),
                    $order->type === 'delivery' ? 'Delivery' : 'Pick-up',
                    ucfirst($order->status),
                    $order->name,
                    $order->phone,
                    $order->type === 'delivery' ? $order->address : ($order->pickup_time ?? 'As soon as possible'),
                    collect($order->items)->map(fn (array $i) => $i['qty'].' × '.$i['name_en'].($i['size_en'] ? " ({$i['size_en']})" : ''))->implode('; '),
                    collect($order->items)->sum('qty'),
                    number_format((float) $order->total, 2, '.', ''),
                    $order->notes,
                    $order->admin_note,
                ]);
            }
            fclose($out);
        }, 'borektime-orders-'.$month->format('Y-m').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function month(Request $request): CarbonImmutable
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
            'type' => ['nullable', Rule::in(Order::TYPES)],
            'status' => ['nullable', Rule::in(Order::STATUSES)],
        ]);

        return $request->filled('month')
            ? CarbonImmutable::createFromFormat('Y-m-d H:i', $request->input('month').'-01 00:00', ReservationRules::TIMEZONE)
            : CarbonImmutable::now(ReservationRules::TIMEZONE)->startOfMonth();
    }

    /** @return Builder<Order> */
    private function query(Request $request, CarbonImmutable $month): Builder
    {
        return Order::query()
            ->whereBetween('created_at', [$month->utc(), $month->addMonth()->utc()->subSecond()])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')));
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array{orders: int, total: float}
     */
    private function totals(Collection $orders): array
    {
        return ['orders' => $orders->count(), 'total' => round((float) $orders->sum('total'), 3)];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return list<array{name_en: string, name_ar: string, size_en: ?string, qty: int, total: float}>
     */
    private function topDishes(Collection $orders): array
    {
        return $orders->flatMap(fn (Order $o) => $o->items)
            ->groupBy(fn (array $i) => $i['name_en'].'|'.($i['size_en'] ?? ''))
            ->map(fn ($lines) => [
                'name_en' => $lines[0]['name_en'],
                'name_ar' => $lines[0]['name_ar'],
                'size_en' => $lines[0]['size_en'] ?? null,
                'qty' => (int) $lines->sum('qty'),
                'total' => round((float) $lines->sum('total'), 3),
            ])
            ->sortByDesc('qty')
            ->take(10)
            ->values()
            ->all();
    }
}
