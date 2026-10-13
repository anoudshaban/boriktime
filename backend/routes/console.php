<?php

use App\Support\MenuImporter;
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
