<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use App\Support\MenuImporter;
use App\Support\MenuSync;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(MenuImporter $importer, MenuSync $sync): void
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

        // Latest prices and names (FINAL menu 22-10-2026). Photos are added from the dashboard.
        $latest = $sync->sync(database_path('data/menu.json'));
        $this->command?->info("Price list: {$latest['updated']} updated, {$latest['created']} new, {$latest['hidden']} hidden.");
    }
}
