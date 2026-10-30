<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Offer;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * Applies a full price list (database/data/menu.json) to the menu:
 * dishes are matched by English name (or an old name listed under "was", for
 * renamed dishes) because menu numbers shift between price lists; numbers,
 * names, Arabic names and prices are updated, new dishes are added, and
 * dishes no longer on the list are hidden rather than deleted. A dish marked
 * "available": false stays in the file but is hidden (e.g. "coming soon").
 */
class MenuSync
{
    /**
     * @return array{updated: int, created: int, hidden: int}
     */
    public function sync(string $path): array
    {
        $data = json_decode((string) @file_get_contents($path), true);
        if (! is_array($data['sections'] ?? null)) {
            throw new InvalidArgumentException("Not a menu file: {$path}");
        }

        $stats = ['updated' => 0, 'created' => 0, 'hidden' => 0];

        DB::transaction(function () use ($data, &$stats) {
            $seen = [];

            foreach ($data['sections'] as $section) {
                $category = Category::query()->where('slug', $section['slug'])->first() ?? $this->createSection($section['slug']);

                foreach ($section['items'] as $index => $item) {
                    $names = array_map('mb_strtolower', [$item['name_en'], ...(array) ($item['was'] ?? [])]);
                    $product = Product::query()
                        ->whereIn(DB::raw('lower(name_en)'), $names)
                        ->whereNotIn('id', $seen)
                        ->orderByRaw('lower(name_en) = ? desc', [$names[0]])
                        ->first();

                    $product ??= new Product([
                        'tags' => [],
                        'is_featured' => in_array($item['name_en'], config('menu.featured'), true),
                    ]);
                    $stats[$product->exists ? 'updated' : 'created']++;

                    $product->fill([
                        'category_id' => $category->id,
                        'code' => $item['code'] ?? null,
                        'name_en' => $item['name_en'],
                        'name_ar' => $item['name_ar'],
                        'price' => $item['price'] ?? min($item['prices']),
                        // A section with "sizes" (labels) gives each item one price per size in "prices".
                        'sizes' => isset($section['sizes'], $item['prices'])
                            ? array_map(fn (array $size, $price) => $size + ['price' => $price], $section['sizes'], $item['prices'])
                            : null,
                        'sort_order' => $index,
                        'is_available' => $item['available'] ?? true,
                    ]);

                    foreach (['description_en', 'description_ar'] as $field) {
                        if (array_key_exists($field, $item)) {
                            $product->{$field} = $item[$field];
                        }
                    }

                    $product->save();
                    $seen[] = $product->id;
                }
            }

            $stats['hidden'] = Product::query()->whereNotIn('id', $seen)->where('is_available', true)->update(['is_available' => false]);
        });

        MenuCache::flush();

        return $stats;
    }

    /**
     * A section new to this price list: created from config('menu.categories'),
     * under its home-page group and right after the section listed before it there.
     */
    private function createSection(string $slug): Category
    {
        $key = collect(config('menu.categories'))->search(fn (array $meta) => $meta['slug'] === $slug);
        if ($key === false) {
            throw new InvalidArgumentException("Unknown section: {$slug} (add it to config/menu.php)");
        }

        $group = collect(config('menu.groups'))->first(fn (array $g) => in_array($key, $g['sections'], true));
        $parent = $group ? Category::query()->where('slug', $group['slug'])->first() : null;

        $before = $group ? array_slice($group['sections'], 0, array_search($key, $group['sections'], true)) : [];
        $beforeSlugs = array_map(fn (string $title) => config('menu.categories')[$title]['slug'] ?? $title, $before);
        $after = Category::query()->whereIn('slug', $beforeSlugs)->max('sort_order') ?? $parent?->sort_order ?? -1;

        Category::query()->where('sort_order', '>', $after)->increment('sort_order');

        return Category::query()->create(config('menu.categories')[$key] + [
            'parent_id' => $parent?->id,
            'sort_order' => $after + 1,
        ]);
    }

    /**
     * Remove every photo, banner, video and offer image from the menu and storage.
     *
     * @return int number of files deleted
     */
    public function clearPhotos(): int
    {
        $disk = Storage::disk('public');
        $deleted = 0;

        foreach (['products', 'categories', 'videos', 'offers'] as $folder) {
            foreach ($disk->allFiles($folder) as $file) {
                $disk->delete($file);
                $deleted++;
            }
        }

        DB::transaction(function () {
            Product::query()->update(['image_path' => null, 'image_credit' => null, 'video_path' => null]);
            Category::query()->update(['image_path' => null, 'image_credit' => null]);
            Offer::query()->update(['image_path' => null]);
        });

        MenuCache::flush();

        return $deleted;
    }
}
