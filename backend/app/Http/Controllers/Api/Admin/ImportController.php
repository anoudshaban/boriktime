<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\MenuImporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ImportController extends Controller
{
    /**
     * Upload a new version of the menu spreadsheet to update names and prices.
     */
    public function __invoke(Request $request, MenuImporter $importer): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx', 'max:5120'],
            'hide_missing' => ['sometimes', 'boolean'],
        ]);

        try {
            $stats = $importer->import(
                $request->file('file')->getRealPath(),
                hideMissing: $request->boolean('hide_missing'),
            );
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['file' => $e->getMessage()]);
        }

        return response()->json($stats);
    }
}
