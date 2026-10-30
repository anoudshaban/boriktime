import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ClockIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, formatPrice } from '../lib/text'
import type { Product, Settings } from '../types'
import { rise } from './Home'
import { useMenuData, type DishRef } from './menuData'
import { useDishList } from './myList'
import { DishMedia, Price } from './parts'

const DETAILS_KEY = 'bt_delivery_details'

type Details = { name: string; phone: string; address: string }

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

/** Is it delivery time now in Amman? Hours may run past midnight (e.g. 18:00–01:00). */
function openNow(from?: string | null, until?: string | null): boolean {
  if (!from || !until) return true
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Amman', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const now = Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value)
  const a = minutes(from)
  const b = minutes(until)
  return a <= b ? now >= a && now <= b : now >= a || now <= b
}

const amount = (value?: string | null) => (value != null && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : null)

/**
 * Delivery: the dishes staff marked for delivery, a basket kept on the phone, and the
 * guest's details — sent as a ready-written WhatsApp message (no online payment).
 */
export function Delivery({ settings }: { settings: Settings | null }) {
  const { lang, pick, other, t } = useI18n()
  const { groups } = useMenuData()
  const reduce = useReducedMotion()
  const basket = useDishList('bt_delivery')
  const form = useRef<HTMLDivElement>(null)
  const [details, setDetails] = useState<Details>(readDetails)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  // Size shown for each dish that comes in sizes (index into product.sizes).
  const [sizeOf, setSizeOf] = useState<Record<number, number>>({})

  useEffect(() => {
    try {
      localStorage.setItem(DETAILS_KEY, JSON.stringify(details))
    } catch {
      /* private mode */
    }
  }, [details])

  const sections = useMemo(
    () =>
      groups.flatMap((group) =>
        group.sections
          .map((section) => ({ group, section, products: section.products.filter((p) => p.delivery) }))
          .filter((s) => s.products.length),
      ),
    [groups],
  )

  const refs = useMemo(() => {
    const map = new Map<number, DishRef>()
    for (const s of sections) for (const product of s.products) map.set(product.id, { product, section: s.section, group: s.group })
    return map
  }, [sections])

  // Dishes taken off delivery since they were added are skipped.
  const lines = basket.entries
    .map((e) => {
      const ref = refs.get(e.id)
      const size = e.size != null ? ref?.product.sizes?.[e.size] : undefined
      const each = size ? size.price : ref ? (ref.product.sale_price ?? ref.product.price) : 0
      return { ...e, ref, chosen: size, each }
    })
    .filter((l) => l.ref)
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const total = Math.round(lines.reduce((sum, l) => sum + l.each * l.qty, 0) * 1000) / 1000
  const min = amount(settings?.delivery_min)
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en
  const money = (v: number) => `${formatPrice(v, lang)} ${currency ?? ''}`.trim()

  const whatsapp = waNumber(settings?.delivery_whatsapp)
  const open = openNow(settings?.delivery_from, settings?.delivery_until)
  const belowMin = min != null && total < min
  const hours = settings?.delivery_from && settings?.delivery_until ? `${settings.delivery_from} – ${settings.delivery_until}` : null

  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!details.name.trim() || !details.phone.trim() || !details.address.trim()) {
      setMessage(t('fillDetails'))
      form.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      return
    }
    setMessage(null)
    // Written for staff, who read both languages: dish names in Arabic and English, plain digits.
    const cur = settings?.currency_en ?? 'JD'
    const text = [
      '*طلب توصيل — Delivery order*',
      '',
      ...lines.map((l) => {
        const p = l.ref!.product
        const size = l.chosen ? ` (${l.chosen.ar} / ${l.chosen.en})` : ''
        return `${l.qty} × ${p.name.ar} / ${p.name.en}${size} — ${formatPrice(l.each * l.qty, 'en')} ${cur}`
      }),
      '',
      `*الإجمالي / Total: ${formatPrice(total, 'en')} ${cur}*`,
      '',
      `الاسم / Name: ${details.name.trim()}`,
      `الهاتف / Phone: ${details.phone.trim()}`,
      `العنوان / Address: ${details.address.trim()}`,
      ...(notes.trim() ? [`ملاحظات / Notes: ${notes.trim()}`] : []),
    ].join('\n')
    window.location.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`
  }

  const blocked = !whatsapp ? t('deliveryOff') : !open ? t('deliveryClosed') : null

  return (
    <form className="st st-res st-dlv" onSubmit={send} noValidate>
      <motion.header className="st-head st-res__head" {...rise(0, reduce)}>
        <p className="st-eyebrow">{t('deliverySub')}</p>
        <h1 className="st-head__title">{t('delivery')}</h1>
        <p className="st-note">{t('deliveryIntro')}</p>
        {(min != null || hours) && (
          <ul className="st-dlv__facts">
            {min != null && (
              <li>
                {t('deliveryMin')}: {money(min)}
              </li>
            )}
            {hours && (
              <li>
                <ClockIcon size={15} /> {t('deliveryHours')}: <span dir="ltr">{hours}</span>
              </li>
            )}
          </ul>
        )}
        {blocked && <p className="st-dlv__notice">{blocked}</p>}
      </motion.header>

      {sections.length === 0 && <p className="st-note st-dlv__empty">{t('deliveryEmpty')}</p>}

      {sections.map(({ section, products }, si) => (
        <motion.section key={section.slug} className="st-res__card st-dlv__sec" {...rise(0.1 + Math.min(si, 4) * 0.06, reduce)}>
          <h2 className="st-res__label">{pick(section.name)}</h2>
          <ul className="st-dlv__list">
            {products.map((product) => (
              <DeliveryItem
                key={product.id}
                product={product}
                icon={section.icon}
                settings={settings}
                size={product.sizes?.length ? Math.min(sizeOf[product.id] ?? 0, product.sizes.length - 1) : undefined}
                onSize={(i) => setSizeOf((s) => ({ ...s, [product.id]: i }))}
                qtyOf={basket.qtyOf}
                onAdd={basket.add}
                onRemove={basket.remove}
                names={[pick(product.name), other(product.name)]}
              />
            ))}
          </ul>
        </motion.section>
      ))}

      {count > 0 && (
        <>
          <section className="st-res__card st-dlv__order">
            <h2 className="st-res__label">{t('yourOrder')}</h2>
            <ul className="st-dlv__lines">
              {lines.map((l) => (
                <li key={`${l.id}:${l.size ?? ''}`}>
                  <span>
                    {formatInt(l.qty, lang)} × {pick(l.ref!.product.name)}
                    {l.chosen && <small> · {pick(l.chosen)}</small>}
                  </span>
                  <span>{money(l.each * l.qty)}</span>
                </li>
              ))}
              <li className="st-dlv__total">
                <span>{t('total')}</span>
                <span>{money(total)}</span>
              </li>
            </ul>
            {belowMin && (
              <p className="st-res__hint">
                {t('deliveryBelowMin')} ({t('deliveryMin')}: {money(min!)})
              </p>
            )}
          </section>

          <section className="st-res__card" ref={form}>
            <h2 className="st-res__label">{t('yourDetails')}</h2>
            <div className="st-res__fields">
              <label className="st-res__field">
                <span>{t('fullName')}</span>
                <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} autoComplete="name" maxLength={120} required />
              </label>
              <label className="st-res__field">
                <span>{t('phone')}</span>
                <input type="tel" dir="ltr" inputMode="tel" placeholder="07X XXX XXXX" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" maxLength={40} required />
              </label>
              <label className="st-res__field st-res__field--wide">
                <span>{t('yourAddress')}</span>
                <textarea rows={2} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} placeholder={t('addressHint')} autoComplete="street-address" maxLength={300} required />
              </label>
              <label className="st-res__field st-res__field--wide">
                <span>{t('orderNotes')}</span>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </label>
            </div>
            <p className="st-res__hint">{t('paymentNote')}</p>
          </section>

          <div className="st-res__bar">
            <div className="st-res__bar-in">
              <span className="st-res__summary">
                {formatInt(count, lang)} {t('items')} · {money(total)}
              </span>
              <AnimatePresence>
                {message && (
                  <motion.p className="st-res__err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {message}
                  </motion.p>
                )}
              </AnimatePresence>
              <button className="st-res__btn st-dlv__send" disabled={Boolean(blocked) || belowMin}>
                <WhatsappIcon size={17} /> {t('sendWhatsapp')}
              </button>
            </div>
          </div>
        </>
      )}
    </form>
  )
}

type ItemProps = {
  product: Product
  icon: string
  settings: Settings | null
  size?: number
  onSize: (i: number) => void
  qtyOf: (id: number, size?: number) => number
  onAdd: (id: number, size?: number) => void
  onRemove: (id: number, size?: number) => void
  names: [string, string]
}

function DeliveryItem({ product, icon, settings, size, onSize, qtyOf, onAdd, onRemove, names }: ItemProps) {
  const { lang, pick, t } = useI18n()
  const qty = qtyOf(product.id, size)
  const sizes = product.sizes?.length ? product.sizes : null

  return (
    <li className="st-dlv__item">
      <DishMedia product={product} icon={icon} size="g" spin={false} />
      <div className="st-dlv__body">
        <span className="st-dlv__name">{names[0]}</span>
        <span className="st-dlv__alt" lang={lang === 'en' ? 'ar' : 'en'}>
          {names[1]}
        </span>
        {sizes && size != null ? (
          <div className="st-dlv__sizes" role="radiogroup" aria-label={t('chooseSize')}>
            {sizes.map((s, i) => (
              <button key={i} type="button" role="radio" aria-checked={i === size} className={`st-dlv__size${i === size ? ' is-on' : ''}`} onClick={() => onSize(i)}>
                {pick(s)} · {formatPrice(s.price, lang)}
              </button>
            ))}
          </div>
        ) : (
          <Price value={product.price} sale={product.sale_price} settings={settings} className="st-dlv__price" />
        )}
      </div>
      <div className="st-dlv__qty">
        {qty > 0 ? (
          <span className="mylist__qty">
            <button type="button" onClick={() => onRemove(product.id, size)} aria-label="−">
              −
            </button>
            <span>{formatInt(qty, lang)}</span>
            <button type="button" onClick={() => onAdd(product.id, size)} aria-label="+">
              +
            </button>
          </span>
        ) : (
          <button type="button" className="st-dlv__add" onClick={() => onAdd(product.id, size)}>
            + {t('add')}
          </button>
        )}
      </div>
    </li>
  )
}
