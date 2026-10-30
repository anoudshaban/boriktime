<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Delivery and pick-up orders, saved when the guest sends them on WhatsApp. Dish
     * names and prices are copied into `items`, so later menu changes don't rewrite history.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10);
            $table->string('status', 20)->default('new');
            $table->string('name', 120);
            $table->string('phone', 20);
            $table->string('address', 300)->nullable();
            $table->string('pickup_time', 5)->nullable();
            $table->text('notes')->nullable();
            $table->json('items');
            $table->decimal('total', 10, 3);
            $table->string('lang', 2)->default('en');
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index(['status', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
