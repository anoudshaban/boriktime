<?php

namespace App\Support;

use App\Http\Resources\PublicCategoryResource;
use App\Models\Category;
use App\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * The public menu is read far more often than it is edited, so the whole
 * payload is cached as one document and rebuilt whenever a model changes.
 *
 * Shape: groups (home cards) → sections (tabs on the group page) → products.
 * A top-level category without children is shown as a group with one section.
 */
class MenuCache
{
    private const KEY = 'menu.public.v2';

    /**
     * @return array{version: string, settings: array<string, mixed>, groups: array<int, mixed>}
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
     * @return array{version: string, settings: array<string, mixed>, groups: array<int, mixed>}
     */
    private static function build(): array
    {
        $available = fn ($q) => $q->where('is_available', true);

        $groups = Category::query()
            ->topLevel()
            ->active()
            ->ordered()
            ->with([
                'products' => $available,
                'children' => fn ($q) => $q->active()->with(['products' => $available]),
            ])
            ->get()
            ->map(function (Category $group) {
                $sections = $group->children->isNotEmpty() ? $group->children : collect([$group]);
                $sections = $sections->filter(fn (Category $c) => $c->products->isNotEmpty())->values();

                return $sections->isEmpty() ? null : self::group($group, $sections);
            })
            ->filter()
            ->values()
            ->all();

        // Round-trip through JSON so only plain arrays reach the cache: nested
        // resource objects would not survive the cache store's unserialize().
        $json = json_encode([
            'settings' => Setting::allWithDefaults(),
            'groups' => $groups,
        ], JSON_THROW_ON_ERROR);

        return ['version' => substr(sha1($json), 0, 16)] + json_decode($json, true);
    }

    /**
     * @param  Collection<int, Category>  $sections
     * @return array<string, mixed>
     */
    private static function group(Category $group, Collection $sections): array
    {
        return [
            'id' => $group->id,
            'slug' => $group->slug,
            'name' => ['en' => $group->name_en, 'ar' => $group->name_ar],
            'description' => ['en' => $group->description_en, 'ar' => $group->description_ar],
            'icon' => $group->icon,
            'image' => ImageStore::url($group->image_path),
            'sections' => PublicCategoryResource::collection($sections)->resolve(),
        ];
    }
}
