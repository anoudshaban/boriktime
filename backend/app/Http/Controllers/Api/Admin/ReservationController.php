<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Support\ReservationRules;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class ReservationController extends Controller
{
    /**
     * Bookings for the dashboard: "upcoming" (today onwards, soonest first),
     * "today", "past" (latest first) or "all", plus counts for the badges.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'view' => ['nullable', Rule::in(['upcoming', 'today', 'past', 'all'])],
            'status' => ['nullable', Rule::in(Reservation::STATUSES)],
        ]);

        $today = CarbonImmutable::now(ReservationRules::TIMEZONE)->format('Y-m-d');
        $view = $request->input('view', 'upcoming');

        $query = Reservation::query()
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($view === 'upcoming', fn ($q) => $q->where('date', '>=', $today))
            ->when($view === 'today', fn ($q) => $q->where('date', $today))
            ->when($view === 'past', fn ($q) => $q->where('date', '<', $today));

        $query = $view === 'past' || $view === 'all'
            ? $query->orderByDesc('date')->orderByDesc('time')
            : $query->orderBy('date')->orderBy('time');

        return response()->json([
            'data' => $query->limit(300)->get()->map->toAdminArray(),
            'counts' => [
                'pending' => Reservation::query()->where('status', 'pending')->where('date', '>=', $today)->count(),
                'today' => Reservation::query()->where('date', $today)->whereIn('status', ['pending', 'confirmed', 'seated'])->count(),
                'today_guests' => (int) Reservation::query()->where('date', $today)->whereIn('status', ['pending', 'confirmed', 'seated'])->sum('guests'),
            ],
            'today' => $today,
        ]);
    }

    public function update(Request $request, Reservation $reservation): JsonResponse
    {
        $reservation->update($request->validate([
            'status' => ['sometimes', Rule::in(Reservation::STATUSES)],
            'admin_note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]));

        return response()->json($reservation->toAdminArray());
    }

    public function destroy(Reservation $reservation): Response
    {
        $reservation->delete();

        return response()->noContent();
    }
}
