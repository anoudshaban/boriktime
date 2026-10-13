<?php

namespace App\Http\Resources;

use App\Models\Offer;
use App\Support\ImageStore;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin representation of an offer.
 *
 * @mixin Offer
 */
class OfferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title_en' => $this->title_en,
            'title_ar' => $this->title_ar,
            'description_en' => $this->description_en,
            'description_ar' => $this->description_ar,
            'badge_en' => $this->badge_en,
            'badge_ar' => $this->badge_ar,
            'image' => ImageStore::url($this->image_path),
            'price' => $this->price !== null ? (float) $this->price : null,
            'old_price' => $this->old_price !== null ? (float) $this->old_price : null,
            'starts_at' => $this->starts_at?->toDateString(),
            'ends_at' => $this->ends_at?->toDateString(),
            'is_active' => $this->is_active,
            'is_running' => $this->is_active
                && (! $this->starts_at || $this->starts_at->lte(today()))
                && (! $this->ends_at || $this->ends_at->gte(today())),
            'sort_order' => $this->sort_order,
            'product_ids' => $this->whenLoaded('products', fn () => $this->products->pluck('id')),
        ];
    }
}
