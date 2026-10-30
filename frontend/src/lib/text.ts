import type { Lang } from '../types'

/**
 * Loose matching for search: case-insensitive, ignores Turkish accents
 * (börek → borek), Arabic diacritics and the common spelling variants
 * (أ/إ/آ → ا, ة → ه, ى → ي) so guests find dishes however they type.
 */
function foldChars(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
}

export function normalize(value: string): string {
  return foldChars(value).replace(/\s+/g, ' ').trim()
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'

const toArabicDigits = (value: string) => value.replace(/\d/g, (d) => AR_DIGITS[Number(d)]).replace('.', '٫')

/** 14 → "14", 3.5 → "3.50", 0.6 → "0.60", 3.25 → "3.25", 0.125 → "0.125" */
export function formatPrice(value: number, lang: Lang): string {
  const fixed = Number.isInteger(value)
    ? String(value)
    : Math.round(value * 1000) % 10 !== 0
      ? value.toFixed(3)
      : value.toFixed(2)
  return lang === 'ar' ? toArabicDigits(fixed) : fixed
}

export function formatInt(value: number, lang: Lang): string {
  return lang === 'ar' ? toArabicDigits(String(value)) : String(value)
}

/** Splits text around the first match of the query so it can be highlighted. */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const q = normalize(query)
  if (!q) return [{ text, hit: false }]

  // Fold char by char, remembering which source index each folded char came from.
  const map: number[] = []
  let folded = ''
  for (let i = 0; i < text.length; i++) {
    for (const ch of foldChars(text[i])) {
      folded += /\s/.test(ch) ? ' ' : ch
      map.push(i)
    }
  }

  const at = folded.indexOf(q)
  if (at < 0) return [{ text, hit: false }]

  const start = map[at]
  const end = map[at + q.length - 1] + 1
  return [
    { text: text.slice(0, start), hit: false },
    { text: text.slice(start, end), hit: true },
    { text: text.slice(end), hit: false },
  ].filter((p) => p.text)
}

/** A guest's phone: digits only (Arabic ٠–٩ become 0–9), at most 10 — a Jordanian number such as 0791234567. */
export function phoneDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
    .slice(0, 10)
}

/** "0795 112 000" → "962795112000" (wa.me wants the full international number, digits only). */
export function waNumber(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `962${digits.slice(1)}`
  return digits.length >= 8 ? digits : null
}
