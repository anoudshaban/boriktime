import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang, Localized, LocalizedOptional } from '../types'

const STRINGS = {
  menu: { en: 'Menu', ar: 'القائمة' },
  theMenu: { en: 'The menu', ar: 'القائمة' },
  digitalMenu: { en: 'Digital menu', ar: 'القائمة الرقمية' },
  back: { en: 'Back', ar: 'رجوع' },
  quickView: { en: 'Quick view', ar: 'نظرة سريعة' },
  viewDish: { en: 'View dish', ar: 'عرض الطبق' },
  youMayAlsoLike: { en: 'You may also like', ar: 'قد يعجبك أيضاً' },
  signature: { en: 'Signature', ar: 'مميّز' },
  sections: { en: 'Sections', ar: 'الأقسام' },
  notFound: { en: 'This page is not on the menu.', ar: 'هذه الصفحة غير موجودة في القائمة.' },
  home: { en: 'Back to the menu', ar: 'العودة إلى القائمة' },
  offers: { en: 'Offers', ar: 'العروض' },
  todaysOffers: { en: "Today's offers", ar: 'عروض اليوم' },
  offer: { en: 'Offer', ar: 'عرض' },
  until: { en: 'Until', ar: 'حتى' },
  lastDay: { en: 'Last day', ar: 'آخر يوم' },
  includes: { en: 'Included', ar: 'يشمل' },
  viewOffer: { en: 'View offer', ar: 'عرض التفاصيل' },
  partOfOffer: { en: 'Also in an offer', ar: 'ضمن عرض' },
  save: { en: 'Save', ar: 'وفّر' },
  addToList: { en: 'Add to my list', ar: 'أضف إلى قائمتي' },
  addAnother: { en: 'Add one more', ar: 'أضف واحداً آخر' },
  inList: { en: 'in your list', ar: 'في قائمتك' },
  myList: { en: 'My list', ar: 'قائمتي' },
  myListEmpty: { en: 'Your list is empty. Add dishes while you browse, then show it to your waiter.', ar: 'قائمتك فارغة. أضف الأطباق أثناء التصفح ثم اعرضها على النادل.' },
  showWaiter: { en: 'Show this list to your waiter', ar: 'اعرض هذه القائمة على النادل' },
  total: { en: 'Total', ar: 'المجموع' },
  clearList: { en: 'Clear list', ar: 'مسح القائمة' },
  pairsWith: { en: 'Pairs well with', ar: 'يتناسب مع' },
  tapToZoom: { en: 'Tap to zoom', ar: 'اضغط للتكبير' },
  swipeHint: { en: 'Swipe for more', ar: 'اسحب للمزيد' },
  dishes: { en: 'dishes', ar: 'أطباق' },
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
