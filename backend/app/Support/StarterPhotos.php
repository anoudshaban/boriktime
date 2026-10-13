<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Attaches the starter photos shipped in database/data/photos to the menu.
 *
 *   dish-{menu number}.webp    → the dish with that number
 *   banner-{category slug}.webp → that section or group
 *
 * These are openly licensed stock images (see credits.json) meant as
 * stand-ins until the restaurant uploads its own photos. Anything that
 * already has a photo is left alone unless $force is set.
 */
class StarterPhotos
{
    /**
     * @return array{dishes: int, banners: int, skipped: int}
     */
    public function attach(bool $force = false, ?string $dir = null): array
    {
        $stats = ['dishes' => 0, 'banners' => 0, 'skipped' => 0];
        $dir ??= database_path('data/photos');
        $credits = json_decode((string) @file_get_contents($dir.'/credits.json'), true)['photos'] ?? [];

        foreach (glob($dir.'/*.webp') ?: [] as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);

            if (preg_match('/^dish-(\d+)$/', $name, $m)) {
                $model = Product::query()->where('code', (int) $m[1])->first();
                $folder = 'products';
                $kind = 'dishes';
            } elseif (preg_match('/^banner-([a-z0-9-]+)$/', $name, $m)) {
                $model = Category::query()->where('slug', $m[1])->first();
                $folder = 'categories';
                $kind = 'banners';
            } else {
                continue;
            }

            if (! $model || ($model->image_path && ! $force)) {
                $stats['skipped']++;

                continue;
            }

            $old = $model->image_path;
            $path = Storage::disk('public')->putFileAs($folder, new File($file), Str::ulid()->toBase32().'.webp');
            $model->update(['image_path' => $path, 'image_credit' => $credits[$name]['credit'] ?? null]);

            if ($old) {
                Storage::disk('public')->delete($old);
            }

            $stats[$kind]++;
        }

        MenuCache::flush();

        return $stats;
    }
}
