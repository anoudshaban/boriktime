<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Credit line for openly licensed starter photos ("Photo: Jane Doe · CC BY 2.0").
     * Cleared when the restaurant uploads its own photo.
     */
    public function up(): void
    {
        foreach (['products', 'categories'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->string('image_credit')->nullable()->after('image_path');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['products', 'categories'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn('image_credit');
            });
        }
    }
};
