<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'phone', 'guests', 'date', 'time', 'occasion', 'notes', 'status', 'admin_note', 'lang'])]
class Reservation extends Model
{
    public const STATUSES = ['pending', 'confirmed', 'seated', 'cancelled'];

    public const OCCASIONS = ['birthday', 'anniversary', 'business', 'family', 'other'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'guests' => 'integer',
        ];
    }

    /** Short number the guest can quote when calling, e.g. "BT-0042". */
    public function reference(): string
    {
        return 'BT-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<string, mixed>
     */
    public function toAdminArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference(),
            'name' => $this->name,
            'phone' => $this->phone,
            'guests' => $this->guests,
            'date' => $this->date->format('Y-m-d'),
            'time' => $this->time,
            'occasion' => $this->occasion,
            'notes' => $this->notes,
            'status' => $this->status,
            'admin_note' => $this->admin_note,
            'lang' => $this->lang,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
