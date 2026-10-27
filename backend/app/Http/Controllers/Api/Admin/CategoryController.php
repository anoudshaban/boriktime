<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Http\Requests\ReorderRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Support\ImageStore;
use App\Support\MenuCache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()->ordered()->withCount('products')->get()
        );
    }

    public function store(CategoryRequest $request): CategoryResource
    {
        $category = Category::create($request->validated() + [
            'sort_order' => (int) Category::max('sort_order') + 1,
        ]);

        return new CategoryResource($category->loadCount('products'));
    }

    public function update(CategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return new CategoryResource($category->loadCount('products'));
    }

    public function destroy(Category $category): Response
    {
        $this->images->delete($category->image_path);
        $category->products->each(fn ($product) => $this->images->delete($product->image_path));
        $category->delete();

        return response()->noContent();
    }

    public function uploadImage(Request $request, Category $category): CategoryResource
    {
        $request->validate(['image' => ImageStore::RULES], ImageStore::messages('image'));

        $old = $category->image_path;
        $category->update(['image_path' => $this->images->store($request->file('image'), 'categories'), 'image_credit' => null]);
        $this->images->delete($old);

        return new CategoryResource($category->loadCount('products'));
    }

    public function deleteImage(Category $category): CategoryResource
    {
        $this->images->delete($category->image_path);
        $category->update(['image_path' => null, 'image_credit' => null]);

        return new CategoryResource($category->loadCount('products'));
    }

    public function reorder(ReorderRequest $request): Response
    {
        DB::transaction(function () use ($request) {
            foreach ($request->validated('ids') as $position => $id) {
                Category::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });

        MenuCache::flush();

        return response()->noContent();
    }
}
