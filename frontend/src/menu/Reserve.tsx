import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, CheckIcon, ClockIcon, GuestsIcon, MinusIcon, PhoneIcon, PlusIcon, WhatsappIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import { useI18n, type StringKey } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Lang, Settings } from '../types'
import { rise } from './Home'

const TIMEZONE = 'Asia/Amman'
const NOTICE_MINUTES = 30
const DAYS_AHEAD = 60
const DAY_CHIPS = 14
const OCCASIONS = ['birthday', 'anniversary', 'business', 'family', 'other'] as const
const GUEST_KEY = 'bt_guest'

type Occasion = (typeof OCCASIONS)[number]
type Booked = { reference: string; name: string; guests: number; date: string; time: string }

/* ---------- Time helpers (restaurant time, Amman) ---------- */

function nowInAmman(): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  )
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

const toMinutes = (value: string | null | undefined, fallback: number) => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : fallback
}

/** Bookable times; a last time earlier than the first runs past midnight (same rules as the server). */
function slotsFor(s: Settings | null): { time: string; at: number }[] {
  const open = toMinutes(s?.reservation_open, 12 * 60)
  let last = toMinutes(s?.reservation_last, 23 * 60)
  const step = Math.max(15, Number(s?.reservation_interval) || 30)
  if (last < open) last += 24 * 60
  const out = []
  for (let m = open; m <= last; m += step) out.push({ time: `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, at: m })
  return out
}

const locale = (lang: Lang) => (lang === 'ar' ? 'ar-u-nu-arab' : 'en-GB')

function formatTime(time: string, lang: Lang): string {
  const [h, m] = time.split(':').map(Number)
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-arab' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)))
}

function formatDay(date: string, lang: Lang, opts: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
}

/** "·" reads as the Arabic zero (٠) next to Arabic digits, so Arabic uses a comma. */
const separator = (lang: Lang) => (lang === 'ar' ? '، ' : ' · ')

function loadGuest(): { name: string; phone: string } {
  try {
    return { name: '', phone: '', ...JSON.parse(localStorage.getItem(GUEST_KEY) ?? '{}') }
  } catch {
    return { name: '', phone: '' }
  }
}

/* ---------- Page ---------- */

export function Reserve({ settings }: { settings: Settings | null }) {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()
  const [booked, setBooked] = useState<Booked | null>(null)

  const closed = settings?.reservations_enabled === '0'
  const phone = settings?.phone

  return (
    <main className="st st-res">
      <motion.header className="st-head st-res__head" {...rise(0, reduce)}>
        <p className="st-eyebrow">{t('reservations')}</p>
        <h1 className="st-head__title">{t('bookTable')}</h1>
        {!booked && !closed && <p className="st-note">{t('reserveIntro')}</p>}
      </motion.header>

      {closed ? (
        <div className="st-res__card st-res__closed">
          <p>{t('bookingClosed')}</p>
          {phone && (
            <a className="st-res__btn" href={`tel:${phone.replace(/\s/g, '')}`}>
              <PhoneIcon size={17} /> {t('callUs')}
            </a>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {booked ? (
            <Done key="done" booked={booked} settings={settings} lang={lang} onAgain={() => setBooked(null)} />
          ) : (
            <motion.div key="form" exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <BookingForm settings={settings} onBooked={setBooked} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </main>
  )
}

function BookingForm({ settings, onBooked }: { settings: Settings | null; onBooked: (b: Booked) => void }) {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()
  const maxGuests = Math.max(1, Number(settings?.reservation_max_guests) || 20)

  const now = useMemo(nowInAmman, [])
  const slots = useMemo(() => slotsFor(settings), [settings])
  const timesFor = (date: string) => (date === now.date ? slots.filter((s) => s.at >= now.minutes + NOTICE_MINUTES) : slots)
  const days = useMemo(() => Array.from({ length: DAY_CHIPS }, (_, i) => addDays(now.date, i)), [now.date])

  const [guests, setGuests] = useState(2)
  const [date, setDate] = useState(() => (timesFor(now.date).length ? now.date : addDays(now.date, 1)))
  const [time, setTime] = useState<string | null>(null)
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const [guest, setGuest] = useState(loadGuest)
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const times = timesFor(date)
  const pickDate = (value: string) => {
    setDate(value)
    if (time && !timesFor(value).some((s) => s.time === time)) setTime(null)
  }

  const ready = Boolean(time && guest.name.trim().length >= 2 && guest.phone.replace(/\D/g, '').length >= 7)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setErrors({})
    setMessage(null)
    try {
      const res = await api<Booked>('/reservations', {
        method: 'POST',
        body: { name: guest.name.trim(), phone: guest.phone.trim(), guests, date, time, occasion, notes: notes.trim() || null, lang, website: website || undefined },
      })
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify({ name: guest.name.trim(), phone: guest.phone.trim() }))
      } catch {
        /* ignore */
      }
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      onBooked(res)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.errors)
        setMessage(err.status === 429 ? 'Too many attempts — please wait a minute.' : err.firstError)
      } else setMessage('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  const summary = [
    `${formatInt(guests, lang)} ${guests === 1 ? t('guest') : t('guestsWord')}`,
    formatDay(date, lang, { weekday: 'short', day: 'numeric', month: 'short' }),
    time ? formatTime(time, lang) : null,
  ]
    .filter(Boolean)
    .join(separator(lang))

  return (
    <form className="st-res__form" onSubmit={submit} noValidate>
      <Block icon={<GuestsIcon size={18} />} label="guests" delay={0.08}>
        <div className="st-res__guests">
          <button type="button" className="round-btn round-btn--lg" onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} aria-label="−">
            <MinusIcon size={18} />
          </button>
          <motion.output key={guests} className="st-res__count" initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {formatInt(guests, lang)}
          </motion.output>
          <button type="button" className="round-btn round-btn--lg" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} disabled={guests >= maxGuests} aria-label="+">
            <PlusIcon size={18} />
          </button>
        </div>
        <p className="st-res__hint">{t('largeGroup').replace('{n}', formatInt(maxGuests, lang))}</p>
        {errors.guests && <p className="st-res__err">{errors.guests[0]}</p>}
      </Block>

      <Block icon={<CalendarIcon size={18} />} label="date" delay={0.14}>
        <div className="st-res__days" role="radiogroup" aria-label={t('date')}>
          {days.map((d, i) => (
            <button key={d} type="button" role="radio" aria-checked={d === date} className={`st-res__day${d === date ? ' is-on' : ''}`} onClick={() => pickDate(d)}>
              <span className="st-res__day-top">{i === 0 ? t('today') : i === 1 ? t('tomorrow') : formatDay(d, lang, { weekday: 'short' })}</span>
              <span className="st-res__day-num">{formatDay(d, lang, { day: 'numeric' })}</span>
              <span className="st-res__day-mon">{formatDay(d, lang, { month: 'short' })}</span>
            </button>
          ))}
          <label className={`st-res__day st-res__day--other${!days.includes(date) ? ' is-on' : ''}`}>
            <span className="st-res__day-top">{t('otherDate')}</span>
            <CalendarIcon size={20} />
            <input type="date" min={now.date} max={addDays(now.date, DAYS_AHEAD)} value={date} onChange={(e) => e.target.value && pickDate(e.target.value)} aria-label={t('otherDate')} />
          </label>
        </div>
        {!days.includes(date) && <p className="st-res__hint">{formatDay(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </Block>

      <Block icon={<ClockIcon size={18} />} label="time" delay={0.2}>
        {times.length === 0 ? (
          <p className="st-res__hint">{t('noTimesLeft')}</p>
        ) : (
          <div className="st-res__times" role="radiogroup" aria-label={t('time')}>
            {times.map((s) => (
              <button key={s.time} type="button" role="radio" aria-checked={s.time === time} className={`st-res__time${s.time === time ? ' is-on' : ''}`} onClick={() => setTime(s.time)}>
                {formatTime(s.time, lang)}
              </button>
            ))}
          </div>
        )}
        {errors.time && <p className="st-res__err">{errors.time[0]}</p>}
      </Block>

      <Block label="occasion" optional delay={0.26}>
        <div className="st-res__chips">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" aria-pressed={occasion === o} className={`st-chip${occasion === o ? ' is-on st-res__chip-on' : ''}`} onClick={() => setOccasion(occasion === o ? null : o)}>
              <span className="st-chip__label">{t(`occ_${o}` as StringKey)}</span>
            </button>
          ))}
        </div>
      </Block>

      <Block label="yourDetails" delay={0.32}>
        <div className="st-res__fields">
          <label className={`st-res__field${errors.name ? ' has-error' : ''}`}>
            <span>{t('fullName')}</span>
            <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} autoComplete="name" maxLength={120} required />
            {errors.name && <em>{errors.name[0]}</em>}
          </label>
          <label className={`st-res__field${errors.phone ? ' has-error' : ''}`}>
            <span>{t('phone')}</span>
            <input type="tel" dir="ltr" inputMode="tel" placeholder="07X XXX XXXX" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} autoComplete="tel" maxLength={40} required />
            {errors.phone && <em>{errors.phone[0]}</em>}
          </label>
          <label className="st-res__field st-res__field--wide">
            <span>
              {t('specialRequests')} <small>({t('optional')})</small>
            </span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('specialRequestsHint')} maxLength={1000} />
          </label>
          {/* Left empty by people; filled by spam bots. */}
          <input className="st-res__trap" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" name="website" />
        </div>
      </Block>

      <div className="st-res__bar">
        <div className="st-res__bar-in">
          <span className="st-res__summary">{summary}</span>
          <AnimatePresence>
            {message && (
              <motion.p className="st-res__err" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {message}
              </motion.p>
            )}
          </AnimatePresence>
          <button className="st-res__btn" disabled={!ready || busy}>
            {busy ? t('sending') : time ? t('requestBooking') : t('pickTime')}
          </button>
        </div>
      </div>
    </form>
  )
}

function Block({ icon, label, optional, delay, children }: { icon?: ReactNode; label: StringKey; optional?: boolean; delay: number; children: ReactNode }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <motion.fieldset className="st-res__card" {...rise(delay, reduce)}>
      <legend className="st-res__label">
        {icon}
        {t(label)}
        {optional && <small>· {t('optional')}</small>}
      </legend>
      {children}
    </motion.fieldset>
  )
}

function Done({ booked, settings, lang, onAgain }: { booked: Booked; settings: Settings | null; lang: Lang; onAgain: () => void }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const guest = loadGuest()
  const whatsapp = settings?.whatsapp?.replace(/[^\d]/g, '')
  const when = `${formatDay(booked.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${separator(lang)}${formatTime(booked.time, lang)}`
  const waText = `${booked.reference} — ${booked.name}, ${booked.guests} ${booked.guests === 1 ? 'guest' : 'guests'}, ${booked.date} ${booked.time}`

  return (
    <motion.section className="st-res__card st-res__done" initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}>
      <motion.span className="st-res__tick" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}>
        <CheckIcon size={30} strokeWidth={2} />
      </motion.span>
      <h2>{t('bookingSent')}</h2>
      <p className="st-res__done-sub">
        {t('bookingSentSub')
          .replace('{name}', booked.name)
          .replace('{phone}', guest.phone || '')}
      </p>

      <dl className="st-res__ticket">
        <div>
          <dt>{t('bookingRef')}</dt>
          <dd dir="ltr">{booked.reference}</dd>
        </div>
        <div>
          <dt>{t('guests')}</dt>
          <dd>{formatInt(booked.guests, lang)}</dd>
        </div>
        <div className="st-res__ticket-wide">
          <dt>{t('date')}</dt>
          <dd>{when}</dd>
        </div>
      </dl>

      <div className="st-res__actions">
        {whatsapp && (
          <a className="st-res__btn st-res__btn--ghost" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer">
            <WhatsappIcon size={17} /> {t('messageUs')}
          </a>
        )}
        <Link to="/" className="st-res__btn">
          {t('browseMenu')}
        </Link>
        <button type="button" className="st-res__link" onClick={onAgain}>
          {t('newBooking')}
        </button>
      </div>
    </motion.section>
  )
}
