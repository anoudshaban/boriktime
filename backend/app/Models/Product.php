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
    'price', 'sale_price', 'calories', 'tags', 'image_path', 'image_credit', 'video_path', 'is_featured', 'is_available', 'sort_order',
])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /** Tags the admin can attach; the frontend has an icon and label for each. */
    public const TAGS = ['new', 'popular', 'spicy', 'vegetarian', 'vegan', 'sharing', 'gluten_free', 'nuts'];

    protected static function booted(): void
    {
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
            'calories' => 'integer',
            'code' => 'integer',
            'tags' => 'array',
            'is_featured' => 'boolean',
            'is_available' => 'boolean',
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
