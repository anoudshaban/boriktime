import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang, Localized, LocalizedOptional } from '../types'

const STRINGS = {
  menu: { en: 'Menu', ar: 'القائمة' },
  viewMenu: { en: 'Explore the menu', ar: 'تصفّح القائمة' },
  search: { en: 'Search', ar: 'بحث' },
  searchPlaceholder: { en: 'Search dishes, drinks…', ar: 'ابحث عن طبق أو مشروب…' },
  noResults: { en: 'Nothing matches', ar: 'لا توجد نتائج' },
  noResultsHint: { en: 'Try another word — English or Arabic both work.', ar: 'جرّب كلمة أخرى — العربية والإنجليزية مدعومتان.' },
  results: { en: 'results', ar: 'نتيجة' },
  chefsPicks: { en: "Chef's picks", ar: 'اختيارات الشيف' },
  chefsPicksSub: { en: 'The dishes our guests come back for', ar: 'الأطباق التي يعود ضيوفنا من أجلها' },
  items: { en: 'items', ar: 'صنف' },
  item: { en: 'item', ar: 'صنف' },
  grid: { en: 'Cards', ar: 'بطاقات' },
  list: { en: 'List', ar: 'قائمة' },
  close: { en: 'Close', ar: 'إغلاق' },
  share: { en: 'Share', ar: 'مشاركة' },
  copied: { en: 'Link copied', ar: 'تم نسخ الرابط' },
  next: { en: 'Next', ar: 'التالي' },
  previous: { en: 'Previous', ar: 'السابق' },
  kcal: { en: 'kcal', ar: 'سعرة' },
  backToTop: { en: 'Back to top', ar: 'للأعلى' },
  loading: { en: 'Setting the table…', ar: 'نُجهّز الطاولة…' },
  loadError: { en: "We couldn't load the menu.", ar: 'تعذّر تحميل القائمة.' },
  retry: { en: 'Try again', ar: 'إعادة المحاولة' },
  offline: { en: 'Offline — showing the last saved menu', ar: 'غير متصل — نعرض آخر نسخة محفوظة' },
  visitUs: { en: 'Visit us', ar: 'زورونا' },
  openingHours: { en: 'Opening hours', ar: 'ساعات العمل' },
  getInTouch: { en: 'Get in touch', ar: 'تواصل معنا' },
  directions: { en: 'Directions', ar: 'الاتجاهات' },
  skip: { en: 'Skip', ar: 'تخطي' },
  language: { en: 'العربية', ar: 'English' },
  tapForDetails: { en: 'Tap any dish for details', ar: 'اضغط على أي طبق للتفاصيل' },
  number: { en: 'No.', ar: 'رقم' },
  tag_new: { en: 'New', ar: 'جديد' },
  tag_popular: { en: 'Popular', ar: 'الأكثر طلباً' },
  tag_spicy: { en: 'Spicy', ar: 'حار' },
  tag_vegetarian: { en: 'Vegetarian', ar: 'نباتي' },
  tag_vegan: { en: 'Vegan', ar: 'نباتي صرف' },
  tag_sharing: { en: 'For sharing', ar: 'للمشاركة' },
  tag_gluten_free: { en: 'Gluten free', ar: 'خالٍ من الغلوتين' },
  tag_nuts: { en: 'Contains nuts', ar: 'يحتوي مكسرات' },
} satisfies Record<string, Localized>

export type StringKey = keyof typeof STRINGS

type I18n = {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (lang: Lang) => void
  toggle: () => void
  t: (key: StringKey) => string
  /** Pick the current language from a {en, ar} pair, falling back to the other one. */
  pick: (value: Localized | LocalizedOptional) => string
  /** The other language's text, used for the small bilingual subtitle. */
  other: (value: Localized | LocalizedOptional) => string
}

const I18nContext = createContext<I18n | null>(null)
const STORAGE_KEY = 'bt_lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'ar') return saved
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => setLangState(next), [])
  const toggle = useCallback(() => setLangState((l) => (l === 'en' ? 'ar' : 'en')), [])

  const value = useMemo<I18n>(() => {
    const otherLang: Lang = lang === 'en' ? 'ar' : 'en'
    return {
      lang,
      dir,
      setLang,
      toggle,
      t: (key) => STRINGS[key][lang],
      pick: (v) => v[lang] || v[otherLang] || '',
      other: (v) => v[otherLang] || '',
    }
  }, [lang, dir, setLang, toggle])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
