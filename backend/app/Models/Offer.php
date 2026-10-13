<?php

namespace App\Models;

use App\Support\MenuCache;
use Database\Factories\OfferFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * A promotion on the menu home: a combo, a weekend deal, a new dish launch…
 * Optional dates limit when it is shown; linked dishes are listed with it.
 */
#[Fillable([
    'title_en', 'title_ar', 'description_en', 'description_ar', 'badge_en', 'badge_ar',
    'image_path', 'price', 'old_price', 'starts_at', 'ends_at', 'is_active', 'sort_order',
])]
class Offer extends Model
{
    /** @use HasFactory<OfferFactory> */
    use HasFactory;

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
            'old_price' => 'decimal:3',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)->orderBy('sort_order');
    }

    /**
     * Active and inside its date window (dates are inclusive).
     */
    #[Scope]
    protected function running(Builder $query, ?Carbon $today = null): void
    {
        $today = ($today ?? today())->toDateString();

        $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('starts_at')->orWhereDate('starts_at', '<=', $today))
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhereDate('ends_at', '>=', $today));
    }

    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderByDesc('id');
    }
}
