<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\OfferRequest;
use App\Http\Requests\ReorderRequest;
use App\Http\Resources\OfferResource;
use App\Models\Offer;
use App\Support\ImageStore;
use App\Support\MenuCache;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class OfferController extends Controller
{
    public function __construct(private ImageStore $images) {}

    public function index(): AnonymousResourceCollection
    {
        return OfferResource::collection(Offer::query()->ordered()->with('products:id')->get());
    }

    public function store(OfferRequest $request): OfferResource
    {
        $offer = DB::transaction(function () use ($request) {
            $offer = Offer::create($request->safe()->except('product_ids') + ['sort_order' => (int) Offer::max('sort_order') + 1]);
            $offer->products()->sync($request->validated('product_ids', []));

            return $offer;
        });

        MenuCache::flush();

        return new OfferResource($offer->load('products:id'));
    }

    public function update(OfferRequest $request, Offer $offer): OfferResource
    {
        DB::transaction(function () use ($request, $offer) {
            $offer->update($request->safe()->except('product_ids'));
            if ($request->has('product_ids')) {
                $offer->products()->sync($request->validated('product_ids', []));
            }
        });

        MenuCache::flush();

        return new OfferResource($offer->load('products:id'));
    }

    public function destroy(Offer $offer): Response
    {
        $this->images->delete($offer->image_path);
        $offer->delete();

        return response()->noContent();
    }

    public function uploadImage(Request $request, Offer $offer): OfferResource
    {
        $request->validate(['image' => ['required', 'image', 'max:8192']]);

        $old = $offer->image_path;
        $offer->update(['image_path' => $this->images->store($request->file('image'), 'offers')]);
        $this->images->delete($old);

        return new OfferResource($offer->load('products:id'));
    }

    public function deleteImage(Offer $offer): OfferResource
    {
        $this->images->delete($offer->image_path);
        $offer->update(['image_path' => null]);

        return new OfferResource($offer->load('products:id'));
    }

    public function reorder(ReorderRequest $request): Response
    {
        DB::transaction(function () use ($request) {
            foreach ($request->validated('ids') as $position => $id) {
                Offer::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });

        MenuCache::flush();

        return response()->noContent();
    }
}
