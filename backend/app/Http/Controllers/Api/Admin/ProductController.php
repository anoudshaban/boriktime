<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Requests\ReorderRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\ImageStore;
use App\Support\MenuCache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'category_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $products = Product::query()
            ->when($request->integer('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->search($request->string('search')->toString())
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ProductResource::collection($products);
    }

    public function store(ProductRequest $request): ProductResource
    {
        $data = $request->validated();
        $data['sort_order'] = (int) Product::where('category_id', $data['category_id'])->max('sort_order') + 1;

        return new ProductResource(Product::create($data));
    }

    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $product->update($request->validated());

        return new ProductResource($product);
    }

    public function destroy(Product $product): Response
    {
        $this->images->delete($product->image_path);
        $product->delete();

        return response()->noContent();
    }

    public function uploadImage(Request $request, Product $product): ProductResource
    {
        $request->validate(['image' => ['required', 'image', 'max:8192']]);

        $old = $product->image_path;
        $product->update(['image_path' => $this->images->store($request->file('image'), 'products')]);
        $this->images->delete($old);

        return new ProductResource($product);
    }

    public function deleteImage(Product $product): ProductResource
    {
        $this->images->delete($product->image_path);
        $product->update(['image_path' => null]);

        return new ProductResource($product);
    }

    public function reorder(ReorderRequest $request): Response
    {
        DB::transaction(function () use ($request) {
            foreach ($request->validated('ids') as $position => $id) {
                Product::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });

        MenuCache::flush();

        return response()->noContent();
    }
}
