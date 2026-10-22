<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Support\ReservationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ReservationController extends Controller
{
    /**
     * A guest asks for a table. It arrives as "pending" until the restaurant confirms it.
     */
    public function store(Request $request): JsonResponse
    {
        $rules = ReservationRules::current();

        if (! $rules->enabled()) {
            throw ValidationException::withMessages(['date' => 'Online booking is closed right now — please call us.']);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:40', 'regex:/^\+?[\d\s\-()]{7,20}$/'],
            'guests' => ['required', 'integer', 'min:1', 'max:'.$rules->maxGuests()],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'occasion' => ['nullable', Rule::in(Reservation::OCCASIONS)],
            'notes' => ['nullable', 'string', 'max:1000'],
            'lang' => ['nullable', Rule::in(['en', 'ar'])],
            // Hidden field real guests never fill; bots usually do.
            'website' => ['prohibited'],
        ], [
            'phone.regex' => 'Please enter a valid phone number.',
            'guests.max' => 'For more than :max guests, please call us.',
        ]);

        if ($problem = $rules->problem($data['date'], $data['time'])) {
            throw ValidationException::withMessages(['time' => $problem]);
        }

        $reservation = Reservation::create([...$data, 'lang' => $data['lang'] ?? 'en', 'status' => 'pending']);

        return response()->json([
            'reference' => $reservation->reference(),
            'name' => $reservation->name,
            'guests' => $reservation->guests,
            'date' => $reservation->date->format('Y-m-d'),
            'time' => $reservation->time,
            'status' => $reservation->status,
        ], 201);
    }
}
