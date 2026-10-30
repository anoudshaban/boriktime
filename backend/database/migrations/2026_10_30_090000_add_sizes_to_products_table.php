<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Optional sizes with their own prices, e.g. börek trays of 12 / 24 / 40
     * pieces: [{"en": "Small · 12 pcs", "ar": "صغيرة · 12 قطعة", "price": 9}, …].
     * The product price then holds the smallest one ("from 9 JD").
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->json('sizes')->nullable()->after('sale_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sizes');
        });
    }
};
