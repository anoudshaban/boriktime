<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\ImportController;
use App\Http\Controllers\Api\Admin\OfferController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MenuController;
use Illuminate\Support\Facades\Route;

// Public
Route::get('/menu', MenuController::class)->name('menu');

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:6,1')
    ->name('auth.login');

// Admin
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::put('/auth/me', [AuthController::class, 'update'])->name('auth.update');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

    Route::prefix('admin')->name('admin.')->group(function () {
        Route::post('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
        Route::post('categories/{category}/image', [CategoryController::class, 'uploadImage'])->name('categories.image');
        Route::delete('categories/{category}/image', [CategoryController::class, 'deleteImage'])->name('categories.image.delete');
        Route::apiResource('categories', CategoryController::class)->except('show');

        Route::post('products/reorder', [ProductController::class, 'reorder'])->name('products.reorder');
        Route::post('products/{product}/image', [ProductController::class, 'uploadImage'])->name('products.image');
        Route::delete('products/{product}/image', [ProductController::class, 'deleteImage'])->name('products.image.delete');
        Route::apiResource('products', ProductController::class)->except('show');

        Route::post('offers/reorder', [OfferController::class, 'reorder'])->name('offers.reorder');
        Route::post('offers/{offer}/image', [OfferController::class, 'uploadImage'])->name('offers.image');
        Route::delete('offers/{offer}/image', [OfferController::class, 'deleteImage'])->name('offers.image.delete');
        Route::apiResource('offers', OfferController::class)->except('show');

        Route::get('settings', [SettingController::class, 'show'])->name('settings.show');
        Route::put('settings', [SettingController::class, 'update'])->name('settings.update');
        Route::post('settings/logo', [SettingController::class, 'uploadLogo'])->name('settings.logo');
        Route::delete('settings/logo', [SettingController::class, 'deleteLogo'])->name('settings.logo.delete');

        Route::post('import', ImportController::class)->name('import');
    });
});
