<?php

use App\Support\MenuImporter;
use App\Support\StarterPhotos;
use Illuminate\Support\Facades\Artisan;

Artisan::command('menu:import {path? : Path to the .xlsx menu (defaults to database/data/menu.xlsx)}
                {--fresh : Delete all categories and dishes before importing}
                {--hide-missing : Hide dishes that are no longer in the spreadsheet}', function (MenuImporter $importer) {
    $path = $this->argument('path') ?? config('menu.source');

    if ($this->option('fresh') && ! $this->confirm('This deletes every category and dish (and their photo links). Continue?', true)) {
        return 1;
    }

    $stats = $importer->import($path, (bool) $this->option('fresh'), (bool) $this->option('hide-missing'));

    $this->components->info("Imported {$stats['categories']} sections: {$stats['created']} new dishes, {$stats['updated']} updated, {$stats['hidden']} hidden.");

    return 0;
})->purpose('Import or update the menu from the restaurant spreadsheet');

Artisan::command('menu:photos {--force : Replace photos that were already uploaded}', function (StarterPhotos $photos) {
    $stats = $photos->attach((bool) $this->option('force'));

    $this->components->info("Attached {$stats['dishes']} dish photos and {$stats['banners']} banners ({$stats['skipped']} skipped: already had a photo or not on the menu).");

    return 0;
})->purpose('Attach the starter photos from database/data/photos to dishes and sections without a photo');
