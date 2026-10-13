<?php

namespace App\Models;

use App\Support\ImageStore;
use App\Support\MenuCache;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'value'])]
class Setting extends Model
{
    /** Settings key holding the uploaded logo's storage path (replaces the built-in logo). */
    public const LOGO = 'logo_path';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected static function booted(): void
    {
        static::saved(fn () => MenuCache::flush());
        static::deleted(fn () => MenuCache::flush());
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'json',
        ];
    }

    /**
     * All settings, with config defaults filled in for keys never saved.
     *
     * @return array<string, mixed>
     */
    public static function allWithDefaults(): array
    {
        $stored = static::query()->pluck('value', 'key')->all();

        // The uploaded logo is stored as a disk path; the menu needs its URL.
        $logo = $stored[self::LOGO] ?? null;
        unset($stored[self::LOGO]);

        return array_merge(config('menu.default_settings'), $stored, ['logo_url' => ImageStore::url($logo)]);
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function putMany(array $values): void
    {
        foreach ($values as $key => $value) {
            static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
