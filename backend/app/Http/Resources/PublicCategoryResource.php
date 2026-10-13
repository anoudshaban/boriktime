<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Support\ImageStore;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class PublicCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => ['en' => $this->name_en, 'ar' => $this->name_ar],
            'description' => ['en' => $this->description_en, 'ar' => $this->description_ar],
            'icon' => $this->icon,
            'image' => ImageStore::url($this->image_path),
            'image_credit' => $this->image_credit,
            'products' => PublicProductResource::collection($this->whenLoaded('products')),
        ];
    }
}
