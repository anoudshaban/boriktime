<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['type', 'status', 'name', 'phone', 'address', 'pickup_time', 'notes', 'items', 'total', 'lang', 'admin_note'])]
class Order extends Model
{
    public const TYPES = ['delivery', 'pickup'];

    /** "new" until staff look at it; cancelled orders are left out of the monthly numbers. */
    public const STATUSES = ['new', 'confirmed', 'done', 'cancelled'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'items' => 'array',
            'total' => 'decimal:3',
        ];
    }

    /** Short number the guest and staff can quote, e.g. "OR-0042" (also in the WhatsApp message). */
    public function reference(): string
    {
        return 'OR-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference(),
            'type' => $this->type,
            'status' => $this->status,
            'name' => $this->name,
            'phone' => $this->phone,
            'address' => $this->address,
            'pickup_time' => $this->pickup_time,
            'notes' => $this->notes,
            'items' => $this->items,
            'total' => (float) $this->total,
            'lang' => $this->lang,
            'admin_note' => $this->admin_note,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
