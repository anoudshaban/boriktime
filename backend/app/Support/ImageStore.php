<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stores menu photos on the public disk, downscaled and re-encoded as WebP
 * so phones on restaurant Wi-Fi load the menu quickly.
 */
class ImageStore
{
    private const MAX_EDGE = 1200;

    private const QUALITY = 82;

    /** Validation for an uploaded photo (the admin also shrinks photos before sending). */
    public const RULES = ['required', 'image', 'max:20480'];

    /**
     * Plain-language errors for the admin's upload box.
     *
     * @return array<string, string>
     */
    public static function messages(string $field): array
    {
        return [
            "{$field}.image" => 'This file is not a photo we can use. Please choose a JPG, PNG or WebP photo. (iPhone HEIC photos: on the iPhone go to Settings → Camera → Formats → Most Compatible, or share the photo as JPG.)',
            "{$field}.mimes" => 'Please choose a PNG, JPG or WebP picture.',
            "{$field}.max" => 'This photo is too big (over 20 MB). Please choose a smaller photo.',
            "{$field}.uploaded" => 'The photo did not finish uploading. Please try again.',
        ];
    }

    public function store(UploadedFile $file, string $folder, string $field = 'image'): string
    {
        $name = $folder.'/'.Str::ulid()->toBase32();
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));

        // Files that pass validation but can't be decoded (e.g. iPhone HEIC) would
        // be stored as a picture no browser shows — refuse them instead.
        if ($source === false) {
            throw ValidationException::withMessages([$field => self::messages($field)["{$field}.image"]]);
        }

        if (! function_exists('imagewebp')) {
            return $file->storeAs($folder, basename($name).'.'.$file->extension(), 'public');
        }

        $image = $this->downscale($source);
        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);

        ob_start();
        imagewebp($image, null, self::QUALITY);
        $bytes = (string) ob_get_clean();

        Storage::disk('public')->put($name.'.webp', $bytes);

        return $name.'.webp';
    }

    public function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    private function downscale(\GdImage $source): \GdImage
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, self::MAX_EDGE / max($width, $height));

        if ($scale === 1) {
            return $source;
        }

        $w = (int) round($width * $scale);
        $h = (int) round($height * $scale);
        $target = imagecreatetruecolor($w, $h);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        imagecopyresampled($target, $source, 0, 0, 0, 0, $w, $h, $width, $height);

        return $target;
    }
}
