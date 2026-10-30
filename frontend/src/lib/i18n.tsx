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
  priceFrom: { en: 'from', ar: 'من' },
  chooseSize: { en: 'Choose a size', ar: 'اختر الحجم' },
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
  photoCredits: { en: 'Photo credits', ar: 'حقوق الصور' },
  photoCreditsNote: { en: 'Some photos are openly licensed stock images shown until our own photos are added.', ar: 'بعض الصور صور مرخّصة بشكل مفتوح وتُعرض مؤقتاً حتى تُضاف صورنا الخاصة.' },
  photo: { en: 'Photo', ar: 'صورة' },
  chooseTable: { en: 'Pull up a chair', ar: 'تفضّلوا إلى الطاولة' },
  chooseTableSub: { en: 'Three rooms, one table — pick where to begin.', ar: 'ثلاث محطات وطاولة واحدة — اختاروا من أين تبدؤون.' },
  signatures: { en: 'Signature dishes', ar: 'أطباقنا المميّزة' },
  signaturesSub: { en: 'The plates our guests come back for.', ar: 'الأطباق التي يعود ضيوفنا من أجلها.' },
  scroll: { en: 'Scroll', ar: 'مرّر' },
  seeAll: { en: 'See all', ar: 'عرض الكل' },
  sectionsWord: { en: 'sections', ar: 'أقسام' },
  view: { en: 'View', ar: 'عرض' },
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
  welcome: { en: 'Welcome', ar: 'أهلاً وسهلاً' },
  gateMenuSub: { en: 'Dishes, drinks and sweets', ar: 'الأطباق والمشروبات والحلويات' },
  bookTable: { en: 'Book a table', ar: 'احجز طاولة' },
  gateBookSub: { en: 'Reserve in under a minute', ar: 'احجز خلال أقل من دقيقة' },
  delivery: { en: 'Delivery', ar: 'توصيل' },
  deliverySub: { en: 'Order to your door on WhatsApp', ar: 'اطلب لباب بيتك عبر واتساب' },
  deliveryIntro: { en: 'Choose your dishes, then send the order to us on WhatsApp.', ar: 'اختر أطباقك ثم أرسل الطلب لنا عبر واتساب.' },
  deliveryAvailable: { en: 'Available for delivery', ar: 'متوفر للتوصيل' },
  deliveryMin: { en: 'Minimum order', ar: 'الحد الأدنى للطلب' },
  deliveryHours: { en: 'Delivery hours', ar: 'أوقات التوصيل' },
  deliveryClosed: { en: 'Delivery is closed right now. You can still prepare your order.', ar: 'التوصيل مغلق حالياً. يمكنك تجهيز طلبك الآن.' },
  deliveryOff: { en: 'Online delivery orders are not open yet. Please call us.', ar: 'طلبات التوصيل عبر الموقع غير متاحة بعد. يرجى الاتصال بنا.' },
  deliveryEmpty: { en: 'No dishes are available for delivery yet.', ar: 'لا توجد أطباق متاحة للتوصيل حالياً.' },
  deliveryBelowMin: { en: 'Add a little more to reach the minimum order', ar: 'أضف القليل للوصول إلى الحد الأدنى للطلب' },
  yourOrder: { en: 'Your order', ar: 'طلبك' },
  add: { en: 'Add', ar: 'أضف' },
  yourAddress: { en: 'Area and address', ar: 'المنطقة والعنوان' },
  addressHint: { en: 'Area, street, building, floor', ar: 'المنطقة، الشارع، البناية، الطابق' },
  orderNotes: { en: 'Notes (optional)', ar: 'ملاحظات (اختياري)' },
  sendWhatsapp: { en: 'Send order on WhatsApp', ar: 'أرسل الطلب عبر واتساب' },
  fillDetails: { en: 'Please fill in your name, phone and address', ar: 'يرجى تعبئة الاسم ورقم الهاتف والعنوان' },
  paymentNote: { en: 'Payment on delivery. We confirm the order and time on WhatsApp.', ar: 'الدفع عند الاستلام. نؤكد الطلب والوقت عبر واتساب.' },
  reservations: { en: 'Reservations', ar: 'الحجوزات' },
  reserveIntro: { en: "Tell us when you're coming — we'll call you to confirm.", ar: 'أخبرنا بموعد زيارتك — وسنتصل بك لتأكيد الحجز.' },
  guests: { en: 'Guests', ar: 'عدد الأشخاص' },
  guest: { en: 'guest', ar: 'شخص' },
  guestsWord: { en: 'guests', ar: 'أشخاص' },
  largeGroup: { en: 'More than {n}? Please call us.', ar: 'أكثر من {n}؟ يرجى الاتصال بنا.' },
  date: { en: 'Date', ar: 'التاريخ' },
  today: { en: 'Today', ar: 'اليوم' },
  tomorrow: { en: 'Tomorrow', ar: 'غداً' },
  otherDate: { en: 'Other date', ar: 'تاريخ آخر' },
  time: { en: 'Time', ar: 'الوقت' },
  noTimesLeft: { en: 'No more times today — please pick another day.', ar: 'لا توجد أوقات متاحة اليوم — اختر يوماً آخر.' },
  occasion: { en: 'Occasion', ar: 'المناسبة' },
  optional: { en: 'optional', ar: 'اختياري' },
  occ_birthday: { en: 'Birthday', ar: 'عيد ميلاد' },
  occ_anniversary: { en: 'Anniversary', ar: 'ذكرى سنوية' },
  occ_business: { en: 'Business', ar: 'عمل' },
  occ_family: { en: 'Family', ar: 'عائلي' },
  occ_other: { en: 'Other', ar: 'أخرى' },
  yourDetails: { en: 'Your details', ar: 'بياناتك' },
  fullName: { en: 'Name', ar: 'الاسم' },
  phone: { en: 'Phone', ar: 'رقم الهاتف' },
  specialRequests: { en: 'Special requests', ar: 'طلبات خاصة' },
  specialRequestsHint: { en: 'Special order, cake, high chair, allergies, seating…', ar: 'طلب خاص، كيكة، كرسي أطفال، حساسية، مكان الجلوس…' },
  requestBooking: { en: 'Request booking', ar: 'أرسل طلب الحجز' },
  sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
  pickTime: { en: 'Pick a time', ar: 'اختر الوقت' },
  bookingSent: { en: 'Request received', ar: 'تم استلام طلبك' },
  bookingSentSub: { en: "Thank you, {name}. We'll call {phone} shortly to confirm your table.", ar: 'شكراً {name}. سنتصل بك على {phone} قريباً لتأكيد الحجز.' },
  bookingRef: { en: 'Booking no.', ar: 'رقم الحجز' },
  messageUs: { en: 'Message us on WhatsApp', ar: 'راسلنا على واتساب' },
  browseMenu: { en: 'Browse the menu', ar: 'تصفّح القائمة' },
  newBooking: { en: 'Make another booking', ar: 'حجز جديد' },
  bookingClosed: { en: 'Online booking is closed right now — please call us.', ar: 'الحجز عبر الإنترنت متوقف حالياً — يرجى الاتصال بنا.' },
  callUs: { en: 'Call us', ar: 'اتصل بنا' },
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
