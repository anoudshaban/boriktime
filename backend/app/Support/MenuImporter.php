<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turns the parsed spreadsheet into categories and products.
 *
 * Re-importing is safe: dishes are matched on their English name, so prices
 * and names update in place while uploaded photos, tags and descriptions
 * edited in the admin panel are kept.
 */
class MenuImporter
{
    public function __construct(private XlsxMenuReader $reader) {}

    /**
     * @return array{categories: int, created: int, updated: int, hidden: int}
     */
    public function import(string $path, bool $fresh = false, bool $hideMissing = false): array
    {
        $sections = $this->reader->read($path);
        $stats = ['categories' => 0, 'created' => 0, 'updated' => 0, 'hidden' => 0];

        DB::transaction(function () use ($sections, $fresh, $hideMissing, &$stats) {
            if ($fresh) {
                Product::query()->delete();
                Category::query()->delete();
            }

            $seen = [];

            foreach ($sections as $position => $section) {
                $category = $this->upsertCategory($section['title'], $position);
                $stats['categories']++;

                foreach ($section['items'] as $index => $item) {
                    $product = $this->findProduct($item['name_en'], $item['code'], $seen) ?? new Product([
                        'tags' => config('menu.tags')[$item['name_en']] ?? [],
                        'is_featured' => in_array($item['name_en'], config('menu.featured'), true),
                    ]);

                    $product->fill([
                        'category_id' => $category->id,
                        'code' => $item['code'],
                        'name_en' => $item['name_en'],
                        'name_ar' => $item['name_ar'],
                        'price' => $item['price'],
                        'sort_order' => $index,
                    ]);

                    // Only take descriptions from the sheet when the admin has not written one.
                    $product->description_en ??= $item['description_en'];
                    $product->description_ar ??= $item['description_ar'];

                    $stats[$product->exists ? 'updated' : 'created']++;
                    $product->save();
                    $seen[] = $product->id;
                }
            }

            $this->assignGroups();

            if ($hideMissing) {
                $stats['hidden'] = Product::query()
                    ->whereNotIn('id', $seen)
                    ->where('is_available', true)
                    ->update(['is_available' => false]);
            }
        });

        MenuCache::flush();

        return $stats;
    }

    private function upsertCategory(string $title, int $position): Category
    {
        $meta = config('menu.categories')[Str::lower($title)] ?? [
            'slug' => Str::slug($title),
            'name_en' => Str::title($title),
            'name_ar' => $title,
            'icon' => 'dish',
        ];

        $category = Category::query()->firstOrNew(['slug' => $meta['slug']]);

        if (! $category->exists) {
            $category->fill($meta);
        }

        $category->sort_order = $position;
        $category->save();

        return $category;
    }

    /**
     * Put sections under their home-page group (config menu.groups).
     * Sections the admin already moved elsewhere are left alone.
     */
    private function assignGroups(): void
    {
        foreach (config('menu.groups', []) as $position => $group) {
            $sections = $group['sections'];
            unset($group['sections']);

            $parent = Category::query()->firstOrNew(['slug' => $group['slug']]);
            if (! $parent->exists) {
                $parent->fill($group + ['sort_order' => $position])->save();
            }

            $slugs = collect($sections)
                ->map(fn (string $title) => config('menu.categories')[$title]['slug'] ?? Str::slug($title));

            Category::query()
                ->whereIn('slug', $slugs)
                ->whereNull('parent_id')
                ->whereKeyNot($parent->id)
                ->update(['parent_id' => $parent->id]);
        }
    }

    /**
     * Match on the English name; if the name was edited in the sheet, fall
     * back to the menu number so the dish (and its photo) is renamed, not duplicated.
     *
     * @param  list<int>  $taken  dishes already matched in this import
     */
    private function findProduct(string $nameEn, ?int $code, array $taken): ?Product
    {
        return Product::query()
            ->whereRaw('lower(name_en) = ?', [Str::lower($nameEn)])
            ->first()
            ?? ($code === null ? null : Product::query()->where('code', $code)->whereNotIn('id', $taken)->first());
    }
}
