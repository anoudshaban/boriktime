import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ClockIcon, CloseIcon, DeliveryIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, formatPrice } from '../lib/text'
import type { Product, Settings, Size } from '../types'
import { rise } from './Home'
import { useMenuData, type DishRef } from './menuData'
import { useDishList, type MyList } from './myList'
import { DishMedia, Price } from './parts'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

const DETAILS_KEY = 'bt_delivery_details'
const CHIPS_OFFSET = 128

type Details = { name: string; phone: string; address: string }
/** `ok`: the dish can be ordered the chosen way (the basket is shared by both tabs). */
type Line = { id: number; qty: number; size?: number; ref?: DishRef; chosen?: Size; each: number; ok: boolean }

function readDetails(): Details {
  try {
    const raw = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? '{}')
    return { name: String(raw.name ?? ''), phone: String(raw.phone ?? ''), address: String(raw.address ?? '') }
  } catch {
    return { name: '', phone: '', address: '' }
  }
}

/** "0795 112 000" → "962795112000" (wa.me wants the full international number, digits only). */
function waNumber(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `962${digits.slice(1)}`
  return digits.length >= 8 ? digits : null
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutes since midnight in Amman, whatever the phone's time zone. */
function ammanNow(): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  return Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value)
}

/** Is `at` (minutes) within the hours? Hours may run past midnight (e.g. 18:00–01:00); no hours = always. */
function openAt(at: number, from?: string | null, until?: string | null): boolean {
  if (!from || !until) return true
  const a = minutes(from)
  const b = minutes(until)
  const t = ((at % 1440) + 1440) % 1440
  return a <= b ? t >= a && t <= b : t >= a || t <= b
}

const openNow = (from?: string | null, until?: string | null) => openAt(ammanNow(), from, until)

const hhmm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Pick-up times for the next 12 hours, every 15 minutes from 20 minutes from now, within pick-up hours. */
function pickupSlots(from?: string | null, until?: string | null): string[] {
  const start = Math.ceil((ammanNow() + 20) / 15) * 15
  const slots: string[] = []
  for (let m = start; m < start + 12 * 60; m += 15) if (openAt(m, from, until)) slots.push(hhmm(m))
  return slots
}

export type OrderMode = 'delivery' | 'pickup'
const MODE_KEY = 'bt_order_mode'
const offered = (p: Product, mode: OrderMode) => Boolean(mode === 'delivery' ? p.delivery : p.pickup)

function readMode(): OrderMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'pickup' ? 'pickup' : 'delivery'
  } catch {
    return 'delivery'
  }
}

const amount = (value?: string | null) => (value != null && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : null)

const sectionId = (slug: string) => `dlv-${slug}`

/** Sheets and the basket bar go on the menu root (it holds the colours), outside the page and its entry animation. */
const overlayRoot = () => document.querySelector<HTMLElement>('.menu') ?? document.body

/**
 * Delivery / Pick up: a tab for each way of ordering, section tabs and one short row
 * per dish offered that way. Dishes in sizes open a small sheet to pick size and
 * quantity; the basket (shared by both tabs) opens the checkout sheet, which sends a
 * ready-written WhatsApp message (no online payment).
 */
export function Delivery({ settings }: { settings: Settings | null }) {
  const { lang, pick, t } = useI18n()
  const { groups } = useMenuData()
  const reduce = useReducedMotion()
  const basket = useDishList('bt_delivery')
  const chipsRef = useRef<HTMLDivElement>(null)
  const [picking, setPicking] = useState<DishRef | null>(null)
  const [checkout, setCheckout] = useState(false)
  const [chosenMode, setChosenMode] = useState<OrderMode>(readMode)

  // Dishes offered either way (so the basket keeps them when switching tabs).
  const refs = useMemo(() => {
    const map = new Map<number, DishRef>()
    for (const group of groups) for (const section of group.sections) for (const product of section.products) if (product.delivery || product.pickup) map.set(product.id, { product, section, group })
    return map
  }, [groups])

  const modes = (['delivery', 'pickup'] as const).filter((m) => [...refs.values()].some((r) => offered(r.product, m)))
  const mode: OrderMode = modes.includes(chosenMode) ? chosenMode : (modes[0] ?? 'delivery')
  const setMode = (m: OrderMode) => {
    setChosenMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* private mode */
    }
  }

  const sections = useMemo(
    () =>
      groups.flatMap((group) =>
        group.sections
          .map((section) => ({ group, section, products: section.products.filter((p) => offered(p, mode)) }))
          .filter((s) => s.products.length),
      ),
    [groups, mode],
  )

  const active = useScrollSpy(
    sections.map((s) => sectionId(s.section.slug)),
    CHIPS_OFFSET,
  )
  const activeSlug = active?.replace(/^dlv-/, '') ?? sections[0]?.section.slug

  // Keep the active chip centred in the strip (works in LTR and RTL).
  useEffect(() => {
    const strip = chipsRef.current
    const chip = strip?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`)
    if (!strip || !chip) return
    const a = chip.getBoundingClientRect()
    const b = strip.getBoundingClientRect()
    strip.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
  }, [activeSlug, lang])

  // Dishes taken off delivery and pick-up since they were added are skipped; dishes
  // not offered the chosen way stay in the basket but are left out of the order.
  const lines: Line[] = basket.entries
    .map((e) => {
      const ref = refs.get(e.id)
      const chosen = e.size != null ? ref?.product.sizes?.[e.size] : undefined
      const each = chosen ? chosen.price : ref ? (ref.product.sale_price ?? ref.product.price) : 0
      return { ...e, ref, chosen, each, ok: ref ? offered(ref.product, mode) : false }
    })
    .filter((l) => l.ref)
  const ordered = lines.filter((l) => l.ok)
  const count = ordered.reduce((n, l) => n + l.qty, 0)
  const total = Math.round(ordered.reduce((sum, l) => sum + l.each * l.qty, 0) * 1000) / 1000
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en
  const money = (v: number) => `${formatPrice(v, lang)} ${currency ?? ''}`.trim()

  const from = mode === 'delivery' ? settings?.delivery_from : settings?.pickup_from
  const until = mode === 'delivery' ? settings?.delivery_until : settings?.pickup_until
  const min = mode === 'delivery' ? amount(settings?.delivery_min) : null
  const hours = from && until ? `${from} – ${until}` : null
  const whatsapp = waNumber(settings?.delivery_whatsapp)
  const blocked = !whatsapp ? t('deliveryOff') : !openNow(from, until) ? t(mode === 'delivery' ? 'deliveryClosed' : 'pickupClosed') : null

  // Close the checkout when the basket is emptied from inside it.
  useEffect(() => {
    if (!lines.length) setCheckout(false)
  }, [lines.length])

  const addPicked = (size: number, qty: number) => {
    if (!picking) return
    for (let i = 0; i < qty; i++) basket.add(picking.product.id, size)
    setPicking(null)
  }

  return (
    <main className="st st-dlv">
      <header className="st-head st-dlv__head">
        <motion.h1 className="st-head__title" {...rise(0.05, reduce)}>
          {modes.length > 1 ? t('deliveryPickup') : t(mode)}
        </motion.h1>
        <motion.p className="st-eyebrow" {...rise(0.12, reduce)}>
          {t(mode === 'delivery' ? 'deliverySub' : 'pickupSub')}
        </motion.p>
        {modes.length > 1 && (
          <motion.div className="st-dlv__modes" role="tablist" aria-label={t('deliveryPickup')} {...rise(0.16, reduce)}>
            {modes.map((m) => (
              <button key={m} type="button" role="tab" aria-selected={m === mode} className={`st-dlv__mode${m === mode ? ' is-on' : ''}`} onClick={() => setMode(m)}>
                {m === mode && <motion.span layoutId="dlv-mode" className="st-dlv__mode-on" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="st-dlv__mode-label">
                  {m === 'delivery' ? <DeliveryIcon size={16} /> : <PinIcon size={16} />} {t(m)}
                </span>
              </button>
            ))}
          </motion.div>
        )}
        {(min != null || hours) && (
          <motion.p className="st-dlv__facts" {...rise(0.18, reduce)}>
            {min != null && (
              <span>
                {t('deliveryMin')} {money(min)}
              </span>
            )}
            {hours && (
              <span>
                <ClockIcon size={14} /> {t(mode === 'delivery' ? 'deliveryHours' : 'pickupHours')} <span dir="ltr">{hours}</span>
              </span>
            )}
          </motion.p>
        )}
        {blocked && <p className="st-dlv__notice">{blocked}</p>}
      </header>

      {sections.length > 1 && (
        <div className="st-chips">
          <div className="st-chips__strip" ref={chipsRef} role="tablist" aria-label={t('sections')}>
            {sections.map(({ section }) => {
              const on = section.slug === activeSlug
              return (
                <button
                  key={section.slug}
                  data-slug={section.slug}
                  role="tab"
                  aria-selected={on}
                  className={`st-chip${on ? ' is-on' : ''}`}
                  onClick={() => scrollToSection(sectionId(section.slug), CHIPS_OFFSET - 4)}
                >
                  {on && <motion.span layoutId={`dlv-chip-${mode}`} className="st-chip__on" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="st-chip__label">{pick(section.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="st-body st-dlv__body">
        {sections.length === 0 && <p className="st-note st-dlv__empty">{t('deliveryEmpty')}</p>}

        {sections.map(({ group, section, products }) => (
          <section key={section.slug} id={sectionId(section.slug)} className="st-sec st-dlv__sec" aria-labelledby={`dlv-${section.slug}-h`}>
            <h2 id={`dlv-${section.slug}-h`} className="st-sec__title">
              {pick(section.name)}
            </h2>
            <ul className="st-dlv__list">
              {products.map((product) => (
                <DeliveryRow key={product.id} product={product} icon={section.icon} settings={settings} basket={basket} onPick={() => setPicking({ product, section, group })} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {createPortal(
      <AnimatePresence>
        {lines.length > 0 && (
          <motion.div className="st-dlv__bar" initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
            <button className="st-dlv__bar-btn" onClick={() => setCheckout(true)}>
              <motion.span key={basket.pulse} className="st-dlv__bar-count" initial={reduce ? false : { scale: 1.35 }} animate={{ scale: 1 }}>
                {formatInt(count, lang)}
              </motion.span>
              <span className="st-dlv__bar-label">{t('viewOrder')}</span>
              <span className="st-dlv__bar-total">{money(total)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>,
      overlayRoot(),
      )}

      <Sheet open={picking != null} onClose={() => setPicking(null)} label={picking ? pick(picking.product.name) : ''}>
        {picking && <SizePicker dish={picking} settings={settings} money={money} onAdd={addPicked} />}
      </Sheet>

      <Sheet open={checkout} onClose={() => setCheckout(false)} label={`${t('yourOrder')} · ${t(mode)}`}>
        <Checkout mode={mode} lines={lines} total={total} min={min} blocked={blocked} whatsapp={whatsapp} basket={basket} money={money} settings={settings} />
      </Sheet>
    </main>
  )
}

/* ---------------------------------------------------------------- */

function DeliveryRow({ product, icon, settings, basket, onPick }: { product: Product; icon: string; settings: Settings | null; basket: MyList; onPick: () => void }) {
  const { lang, pick, other, t } = useI18n()
  const sized = Boolean(product.sizes?.length)
  const inBasket = basket.entries.filter((e) => e.id === product.id).reduce((n, e) => n + e.qty, 0)
  const qty = basket.qtyOf(product.id)
  const add = sized ? onPick : () => basket.add(product.id)

  return (
    <li className={`st-dlv__row${inBasket ? ' is-in' : ''}`}>
      <button type="button" className="st-dlv__main" onClick={add}>
        <span className="st-dlv__thumb">
          <DishMedia product={product} icon={icon} size="g" spin={false} />
        </span>
        <span className="st-dlv__text">
          <span className="st-dlv__name">{pick(product.name)}</span>
          <span className="st-dlv__alt" lang={lang === 'en' ? 'ar' : 'en'}>
            {other(product.name)}
          </span>
          <Price value={product.price} sale={product.sale_price} settings={settings} className="st-dlv__price" from={sized} />
        </span>
      </button>

      {!sized && qty > 0 ? (
        <span className="st-dlv__step">
          <button type="button" onClick={() => basket.remove(product.id)} aria-label="−">
            −
          </button>
          <span>{formatInt(qty, lang)}</span>
          <button type="button" onClick={() => basket.add(product.id)} aria-label="+">
            +
          </button>
        </span>
      ) : (
        <button type="button" className="st-dlv__plus" onClick={add} aria-label={`${t('add')} ${pick(product.name)}`}>
          +{sized && inBasket > 0 && <span className="st-dlv__badge">{formatInt(inBasket, lang)}</span>}
        </button>
      )}
    </li>
  )
}

function SizePicker({ dish, settings, money, onAdd }: { dish: DishRef; settings: Settings | null; money: (v: number) => string; onAdd: (size: number, qty: number) => void }) {
  const { lang, pick, other, t } = useI18n()
  const sizes = dish.product.sizes ?? []
  const [size, setSize] = useState(0)
  const [qty, setQty] = useState(1)
  const description = pick(dish.product.description)

  return (
    <div className="st-dlv__pick">
      <p className="st-dlv__alt st-dlv__pick-alt" lang={lang === 'en' ? 'ar' : 'en'}>
        {other(dish.product.name)}
        {description && ` · ${description}`}
      </p>

      <div className="st-dlv__sizes" role="radiogroup" aria-label={t('chooseSize')}>
        {sizes.map((s, i) => (
          <button key={i} type="button" role="radio" aria-checked={i === size} className={`dish__size${i === size ? ' is-on' : ''}`} onClick={() => setSize(i)}>
            <span className="dish__size-name">{pick(s)}</span>
            <Price value={s.price} settings={settings} className="dish__size-price" />
          </button>
        ))}
      </div>

      <div className="st-dlv__pick-foot">
        <span className="st-dlv__step st-dlv__step--lg">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="−">
            −
          </button>
          <span>{formatInt(qty, lang)}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="+">
            +
          </button>
        </span>
        <button type="button" className="st-res__btn st-dlv__pick-add" onClick={() => onAdd(size, qty)}>
          {t('add')} · {money((sizes[size]?.price ?? 0) * qty)}
        </button>
      </div>
    </div>
  )
}

type CheckoutProps = {
  mode: OrderMode
  lines: Line[]
  total: number
  min: number | null
  blocked: string | null
  whatsapp: string | null
  basket: MyList
  money: (v: number) => string
  settings: Settings | null
}

function Checkout({ mode, lines, total, min, blocked, whatsapp, basket, money, settings }: CheckoutProps) {
  const { lang, pick, t } = useI18n()
  const [details, setDetails] = useState<Details>(readDetails)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [time, setTime] = useState('') // '' = as soon as possible
  const slots = useMemo(() => (mode === 'pickup' ? pickupSlots(settings?.pickup_from, settings?.pickup_until) : []), [mode, settings])
  const belowMin = min != null && total < min
  const delivery = mode === 'delivery'
  const ordered = lines.filter((l) => l.ok)

  useEffect(() => {
    setMessage(null)
    try {
      localStorage.setItem(DETAILS_KEY, JSON.stringify(details))
    } catch {
      /* private mode */
    }
  }, [details])

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!details.name.trim() || !details.phone.trim() || (delivery && !details.address.trim())) {
      setMessage(t(delivery ? 'fillDetails' : 'fillPickup'))
      return
    }
    setMessage(null)
    // Written for staff, who read both languages: dish names in Arabic and English, plain digits.
    const cur = settings?.currency_en ?? 'JD'
    const text = [
      delivery ? '*طلب توصيل — Delivery order*' : '*طلب استلام من المطعم — Pick-up order*',
      '',
      ...ordered.map((l) => {
        const p = l.ref!.product
        const size = l.chosen ? ` (${l.chosen.ar} / ${l.chosen.en})` : ''
        return `${l.qty} × ${p.name.ar} / ${p.name.en}${size} — ${formatPrice(l.each * l.qty, 'en')} ${cur}`
      }),
      '',
      `*الإجمالي / Total: ${formatPrice(total, 'en')} ${cur}*`,
      '',
      `الاسم / Name: ${details.name.trim()}`,
      `الهاتف / Phone: ${details.phone.trim()}`,
      delivery ? `العنوان / Address: ${details.address.trim()}` : `وقت الاستلام / Pick-up time: ${time || 'بأسرع وقت / As soon as possible'}`,
      ...(notes.trim() ? [`ملاحظات / Notes: ${notes.trim()}`] : []),
    ].join('\n')
    window.location.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`
  }

  return (
    <form className="st-dlv__checkout" onSubmit={send} noValidate>
      <ul className="st-dlv__lines">
        {lines.map((l) => (
          <li key={`${l.id}:${l.size ?? ''}`} className={l.ok ? undefined : 'is-off'}>
            <span className="st-dlv__line-name">
              {pick(l.ref!.product.name)}
              {l.chosen && <small>{pick(l.chosen)}</small>}
              {l.ok ? <em>{money(l.each * l.qty)}</em> : <em className="st-dlv__line-off">{t(delivery ? 'notForDelivery' : 'notForPickup')}</em>}
            </span>
            <span className="st-dlv__step">
              <button type="button" onClick={() => basket.remove(l.id, l.size)} aria-label="−">
                −
              </button>
              <span>{formatInt(l.qty, lang)}</span>
              <button type="button" onClick={() => basket.add(l.id, l.size)} aria-label="+">
                +
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="st-dlv__total">
        <span>{t('total')}</span>
        <span>{money(total)}</span>
      </p>
      {belowMin && (
        <p className="st-dlv__warn">
          {t('deliveryBelowMin')} · {t('deliveryMin')} {money(min!)}
        </p>
      )}

      <p className="st-eyebrow st-dlv__label">{t('yourDetails')}</p>
      <div className="st-res__fields">
        <label className="st-res__field">
          <span>{t('fullName')}</span>
          <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} autoComplete="name" maxLength={120} required />
        </label>
        <label className="st-res__field">
          <span>{t('phone')}</span>
          <input type="tel" dir="ltr" inputMode="tel" placeholder="07X XXX XXXX" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" maxLength={40} required />
        </label>
        {delivery ? (
          <label className="st-res__field st-res__field--wide">
            <span>{t('yourAddress')}</span>
            <textarea rows={2} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} placeholder={t('addressHint')} autoComplete="street-address" maxLength={300} required />
          </label>
        ) : (
          <label className="st-res__field st-res__field--wide">
            <span>{t('pickupTime')}</span>
            <select value={time} onChange={(e) => setTime(e.target.value)} dir="ltr">
              <option value="">{t('asap')}</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="st-res__field st-res__field--wide">
          <span>{t('orderNotes')}</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </label>
      </div>
      <p className="st-res__hint">{t(delivery ? 'paymentNote' : 'pickupNote')}</p>

      <div className="st-dlv__send-wrap">
        {(message || blocked) && <p className="st-res__err">{message ?? blocked}</p>}
        <button className="st-res__btn st-dlv__send" disabled={Boolean(blocked) || belowMin || !ordered.length}>
          <WhatsappIcon size={17} /> {t('sendWhatsapp')}
        </button>
      </div>
    </form>
  )
}

/**
 * Bottom sheet over the page (closes on the backdrop, the ✕ or Escape). Rendered on the
 * menu root: the page's entry animation would otherwise make "fixed" follow the page.
 */
function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet st-dlv__sheet" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div className="sheet__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet__panel"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <span className="sheet__grab" />
            <header className="sheet__head">
              <h2>{label}</h2>
              <button type="button" className="round-btn" onClick={onClose} aria-label={t('close')}>
                <CloseIcon size={16} />
              </button>
            </header>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    overlayRoot(),
  )
}
