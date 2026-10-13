<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\ImageStore;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin representation: flat editable fields.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'code' => $this->code,
            'name_en' => $this->name_en,
            'name_ar' => $this->name_ar,
            'description_en' => $this->description_en,
            'description_ar' => $this->description_ar,
            'price' => (float) $this->price,
            'calories' => $this->calories,
            'tags' => $this->tags ?? [],
            'image' => ImageStore::url($this->image_path),
            'is_featured' => $this->is_featured,
            'is_available' => $this->is_available,
            'sort_order' => $this->sort_order,
            'updated_at' => $this->updated_at,
        ];
    }
}
