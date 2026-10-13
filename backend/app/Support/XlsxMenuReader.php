<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Reads the restaurant's menu spreadsheet (# | Item | الصنف | Final Price).
 *
 * Rows after the "#" header are either a section title (text in column A
 * only) or a dish (a number in column A). Anything else is ignored, so blank
 * spacer rows and notes do not break the import.
 *
 * A dependency-free reader is enough here: the file is a single small sheet.
 */
class XlsxMenuReader
{
    /**
     * @return list<array{title: string, items: list<array{code: int|null, name_en: string, name_ar: string, description_en: string|null, description_ar: string|null, price: float}>}>
     */
    public function read(string $path): array
    {
        if (! is_file($path)) {
            throw new InvalidArgumentException("Menu file not found: {$path}");
        }

        $rows = $this->rows($path);
        $sections = [];
        $started = false;

        foreach ($rows as $row) {
            $a = trim((string) ($row['A'] ?? ''));
            $b = trim((string) ($row['B'] ?? ''));

            if (! $started) {
                $started = $a === '#';

                continue;
            }

            if ($a !== '' && ! is_numeric($a) && $b === '') {
                $sections[] = ['title' => $this->clean($a), 'items' => []];

                continue;
            }

            if ($b === '' || $sections === []) {
                continue;
            }

            [$nameEn, $descEn] = $this->splitDetails($b);
            [$nameAr, $descAr] = $this->splitDetails((string) ($row['C'] ?? ''));

            $sections[array_key_last($sections)]['items'][] = [
                'code' => is_numeric($a) ? (int) $a : null,
                'name_en' => $nameEn,
                'name_ar' => $nameAr !== '' ? $nameAr : $nameEn,
                'description_en' => $descEn,
                'description_ar' => $descAr,
                'price' => round((float) ($row['D'] ?? 0), 3),
            ];
        }

        if ($sections === []) {
            throw new RuntimeException('No menu sections found. Expected a header row starting with "#".');
        }

        return $sections;
    }

    /**
     * "Breakfast / 2 Persons (Mix Borek 3pcs - Sumit - ...)" becomes a short
     * name plus a description listing what is on the platter.
     *
     * @return array{0: string, 1: string|null}
     */
    private function splitDetails(string $value): array
    {
        $value = $this->clean($value);

        // Only long lists (a platter's contents) become the description;
        // short ones such as "(Pepsi - Seven up - Merinda)" stay in the name.
        if (preg_match('/^(.+?)\s*\((.+)\)\s*$/u', $value, $m)) {
            $parts = array_filter(array_map('trim', preg_split('/\s+-\s+/u', $m[2])));

            if (count($parts) >= 5) {
                return [$m[1], implode(' · ', $parts)];
            }
        }

        return [$value, null];
    }

    private function clean(string $value): string
    {
        return trim(preg_replace('/\s+/u', ' ', $value));
    }

    /**
     * @return list<array<string, string>>
     */
    private function rows(string $path): array
    {
        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            throw new RuntimeException('The file is not a valid .xlsx workbook.');
        }

        $strings = [];
        if (($shared = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
            foreach ($this->xml($shared)->si as $si) {
                $strings[] = $this->text($si);
            }
        }

        $sheetPath = $this->firstSheetPath($zip);
        $sheet = $zip->getFromName($sheetPath);
        $zip->close();

        if ($sheet === false) {
            throw new RuntimeException('The workbook has no worksheet.');
        }

        $rows = [];
        foreach ($this->xml($sheet)->sheetData->row as $row) {
            $cells = [];
            foreach ($row->c as $c) {
                $column = preg_replace('/\d+/', '', (string) $c['r']);
                $type = (string) $c['t'];

                $cells[$column] = match ($type) {
                    's' => $strings[(int) $c->v] ?? '',
                    'inlineStr' => $this->text($c->is),
                    default => (string) $c->v,
                };
            }
            $rows[] = $cells;
        }

        return $rows;
    }

    private function firstSheetPath(ZipArchive $zip): string
    {
        $workbook = $this->xml((string) $zip->getFromName('xl/workbook.xml'));
        $rels = $this->xml((string) $zip->getFromName('xl/_rels/workbook.xml.rels'));

        $sheet = $workbook->sheets->sheet[0] ?? null;
        $relId = $sheet?->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];

        foreach ($rels->Relationship as $rel) {
            if ((string) $rel['Id'] === (string) $relId) {
                return 'xl/'.ltrim(preg_replace('#^/?xl/#', '', (string) $rel['Target']), '/');
            }
        }

        return 'xl/worksheets/sheet1.xml';
    }

    private function text(SimpleXMLElement $node): string
    {
        if (isset($node->t)) {
            $text = (string) $node->t;
        } else {
            $text = '';
            foreach ($node->r as $run) {
                $text .= (string) $run->t;
            }
        }

        return $text;
    }

    private function xml(string $contents): SimpleXMLElement
    {
        $xml = simplexml_load_string($contents, SimpleXMLElement::class, LIBXML_NONET);

        if ($xml === false) {
            throw new RuntimeException('The workbook contains malformed XML.');
        }

        return $xml;
    }
}
