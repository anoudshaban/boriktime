<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MenuCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MenuController extends Controller
{
    /**
     * The full public menu in one response, with an ETag so returning
     * guests revalidate without downloading it again.
     */
    public function __invoke(Request $request): JsonResponse|Response
    {
        $menu = MenuCache::get();
        $etag = '"'.$menu['version'].'"';

        $headers = [
            'ETag' => $etag,
            'Cache-Control' => 'public, max-age=60, stale-while-revalidate=600',
        ];

        if ($request->headers->get('If-None-Match') === $etag) {
            return response()->noContent(304, $headers);
        }

        return response()->json($menu, 200, $headers, JSON_UNESCAPED_UNICODE);
    }
}
