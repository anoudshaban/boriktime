<?php

use Illuminate\Support\Facades\Route;

/*
| The React app is built into public/app (see frontend/vite.config.ts).
| Every non-API URL (/, /admin, /admin/products ...) returns its index.html
| and React Router takes over in the browser.
*/
Route::fallback(function () {
    $index = public_path('app/index.html');

    abort_unless(is_file($index), 404, 'Frontend not built. Run "npm run build" in the frontend folder.');

    return response()->file($index, ['Cache-Control' => 'no-cache']);
});
