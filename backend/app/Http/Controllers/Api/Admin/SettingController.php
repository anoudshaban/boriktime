<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SettingsRequest;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(Setting::allWithDefaults());
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        Setting::putMany($request->validated());

        return response()->json(Setting::allWithDefaults());
    }
}
