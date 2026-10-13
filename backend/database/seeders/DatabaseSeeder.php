<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use App\Support\MenuImporter;
use App\Support\StarterPhotos;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(MenuImporter $importer, StarterPhotos $photos): void
    {
        User::query()->updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@borektime.com')],
            ['name' => 'Börek Time Admin', 'password' => env('ADMIN_PASSWORD', 'BorekTime@2020')],
        );

        foreach (config('menu.default_settings') as $key => $value) {
            Setting::query()->firstOrCreate(['key' => $key], ['value' => $value]);
        }

        $stats = $importer->import(config('menu.source'));

        $this->command?->info("Menu: {$stats['categories']} sections, {$stats['created']} new / {$stats['updated']} updated dishes.");

        $photos = $photos->attach();
        $this->command?->info("Starter photos: {$photos['dishes']} dishes, {$photos['banners']} banners.");
    }
}
