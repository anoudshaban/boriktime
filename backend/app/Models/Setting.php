<?php

namespace App\Models;

use App\Support\MenuCache;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'value'])]
class Setting extends Model
{
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

        return array_merge(config('menu.default_settings'), $stored);
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
