<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SettingsRequest;
use App\Models\Setting;
use App\Support\ImageStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function show(): JsonResponse
    {
        return response()->json(Setting::allWithDefaults());
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        Setting::putMany($request->validated());

        return response()->json(Setting::allWithDefaults());
    }

    /**
     * Replace the built-in (animated) logo with an uploaded image.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate(['logo' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:20480']], ImageStore::messages('logo'));

        $old = Setting::find(Setting::LOGO)?->value;
        Setting::putMany([Setting::LOGO => $this->images->store($request->file('logo'), 'brand', 'logo')]);
        $this->images->delete($old);

        return response()->json(Setting::allWithDefaults());
    }

    /**
     * Go back to the built-in logo.
     */
    public function deleteLogo(): JsonResponse
    {
        $setting = Setting::find(Setting::LOGO);
        $this->images->delete($setting?->value);
        $setting?->delete();

        return response()->json(Setting::allWithDefaults());
    }
}
