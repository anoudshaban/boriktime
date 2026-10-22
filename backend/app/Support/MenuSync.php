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
 * dishes are matched by menu number (or English name when there is none),
 * names, Arabic names and prices are updated, new dishes are added, and
 * dishes no longer on the list are hidden rather than deleted.
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
                $category = Category::query()->where('slug', $section['slug'])->firstOrFail();

                foreach ($section['items'] as $index => $item) {
                    $product = ($item['code'] ?? null) !== null
                        ? Product::query()->where('code', $item['code'])->first()
                        : Product::query()->whereRaw('lower(name_en) = ?', [mb_strtolower($item['name_en'])])->first();

                    $product ??= new Product(['tags' => [], 'is_featured' => false]);
                    $stats[$product->exists ? 'updated' : 'created']++;

                    $product->fill([
                        'category_id' => $category->id,
                        'code' => $item['code'] ?? null,
                        'name_en' => $item['name_en'],
                        'name_ar' => $item['name_ar'],
                        'price' => $item['price'],
                        'sort_order' => $index,
                        'is_available' => true,
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
