<?php

namespace App\Support;

use App\Http\Resources\PublicCategoryResource;
use App\Models\Category;
use App\Models\Offer;
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
    private const KEY = 'menu.public.v3';

    /**
     * Offers depend on the date, so the payload is cached per day and
     * expires at midnight even when nothing was edited.
     *
     * @return array{version: string, settings: array<string, mixed>, groups: array<int, mixed>, offers: array<int, mixed>}
     */
    public static function get(): array
    {
        return Cache::remember(self::key(), now()->endOfDay(), fn () => self::build());
    }

    public static function flush(): void
    {
        Cache::forget(self::key());
    }

    private static function key(): string
    {
        return self::KEY.'.'.today()->toDateString();
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
            'offers' => self::offers(),
        ], JSON_THROW_ON_ERROR);

        return ['version' => substr(sha1($json), 0, 16)] + json_decode($json, true);
    }

    /**
     * Offers running today, with the ids of their (available) dishes.
     *
     * @return list<array<string, mixed>>
     */
    private static function offers(): array
    {
        return Offer::query()
            ->running()
            ->ordered()
            ->with(['products' => fn ($q) => $q->where('is_available', true)->select('products.id')])
            ->get()
            ->map(fn (Offer $offer) => [
                'id' => $offer->id,
                'title' => ['en' => $offer->title_en, 'ar' => $offer->title_ar],
                'description' => ['en' => $offer->description_en, 'ar' => $offer->description_ar],
                'badge' => ['en' => $offer->badge_en, 'ar' => $offer->badge_ar],
                'image' => ImageStore::url($offer->image_path),
                'price' => $offer->price !== null ? (float) $offer->price : null,
                'old_price' => $offer->old_price !== null ? (float) $offer->old_price : null,
                'ends_at' => $offer->ends_at?->toDateString(),
                'product_ids' => $offer->products->pluck('id')->all(),
            ])
            ->all();
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
            'image_credit' => $group->image_credit,
            'sections' => PublicCategoryResource::collection($sections)->resolve(),
        ];
    }
}
