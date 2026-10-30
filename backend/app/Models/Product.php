<?php

namespace App\Models;

use App\Support\MenuCache;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'category_id', 'code', 'name_en', 'name_ar', 'description_en', 'description_ar',
    'price', 'sale_price', 'sizes', 'calories', 'tags', 'image_path', 'image_credit', 'video_path', 'is_featured', 'is_available', 'is_delivery', 'is_pickup', 'sort_order',
])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /** Tags the admin can attach; the frontend has an icon and label for each. */
    public const TAGS = ['new', 'popular', 'spicy', 'vegetarian', 'vegan', 'sharing', 'gluten_free', 'nuts'];

    protected static function booted(): void
    {
        // With sizes, the price is the smallest one, shown as "from …" on the cards.
        static::saving(function (Product $product) {
            $product->sizes = array_map(fn (array $size) => [
                'en' => $size['en'], 'ar' => $size['ar'], 'price' => (float) $size['price'],
            ], $product->sizes ?? []) ?: null;
            if ($product->sizes) {
                $product->price = min(array_column($product->sizes, 'price'));
            }
        });
        static::saved(fn () => MenuCache::flush());
        static::deleted(fn () => MenuCache::flush());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:3',
            'sale_price' => 'decimal:3',
            'sizes' => 'array',
            'calories' => 'integer',
            'code' => 'integer',
            'tags' => 'array',
            'is_featured' => 'boolean',
            'is_available' => 'boolean',
            'is_delivery' => 'boolean',
            'is_pickup' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        if (blank($term)) {
            return;
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], trim($term)).'%';

        $query->where(fn (Builder $q) => $q
            ->where('name_en', 'like', $like)
            ->orWhere('name_ar', 'like', $like)
            ->orWhere('code', trim($term)));
    }
}
