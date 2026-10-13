<?php

namespace App\Support;

use App\Http\Resources\PublicCategoryResource;
use App\Models\Category;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * The public menu is read far more often than it is edited, so the whole
 * payload is cached as one document and rebuilt whenever a model changes.
 */
class MenuCache
{
    private const KEY = 'menu.public.v1';

    /**
     * @return array{version: string, settings: array<string, mixed>, categories: array<int, mixed>}
     */
    public static function get(): array
    {
        return Cache::rememberForever(self::KEY, fn () => self::build());
    }

    public static function flush(): void
    {
        Cache::forget(self::KEY);
    }

    /**
     * @return array{version: string, settings: array<string, mixed>, categories: array<int, mixed>}
     */
    private static function build(): array
    {
        $categories = Category::query()
            ->active()
            ->ordered()
            ->with(['products' => fn ($q) => $q->where('is_available', true)])
            ->get()
            ->filter(fn (Category $category) => $category->products->isNotEmpty())
            ->values();

        // Round-trip through JSON so only plain arrays reach the cache: nested
        // resource objects would not survive the cache store's unserialize().
        $json = json_encode([
            'settings' => Setting::allWithDefaults(),
            'categories' => PublicCategoryResource::collection($categories)->resolve(),
        ], JSON_THROW_ON_ERROR);

        return ['version' => substr(sha1($json), 0, 16)] + json_decode($json, true);
    }
}
