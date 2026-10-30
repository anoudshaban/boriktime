<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\ImageStore;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class PublicProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => ['en' => $this->name_en, 'ar' => $this->name_ar],
            'description' => ['en' => $this->description_en, 'ar' => $this->description_ar],
            'price' => (float) $this->price,
            'sale_price' => $this->sale_price !== null ? (float) $this->sale_price : null,
            'sizes' => $this->sizes ?: null,
            'calories' => $this->calories,
            'tags' => $this->tags ?? [],
            'image' => ImageStore::url($this->image_path),
            'image_credit' => $this->image_credit,
            'video' => ImageStore::url($this->video_path),
            'featured' => $this->is_featured,
        ];
    }
}
