import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { Settings } from '../types'
import { Field, Switch, useToast } from './ui'

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled'

export type Reservation = {
  id: number
  reference: string
  name: string
  phone: string
  guests: number
  date: string
  time: string
  occasion: string | null
  notes: string | null
  status: ReservationStatus
  admin_note: string | null
  lang: 'en' | 'ar'
  created_at: string
}

type Counts = { pending: number; today: number; today_guests: number }
type ListResponse = { data: Reservation[]; counts: Counts; today: string }
type View = 'upcoming' | 'today' | 'past' | 'all'

const VIEWS: { key: View; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
]

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'New request',
  confirmed: 'Confirmed',
  seated: 'Arrived',
  cancelled: 'Cancelled',
}

const OCCASION_LABEL: Record<string, string> = {
  birthday: '🎂 Birthday',
  anniversary: '💍 Anniversary',
  business: '💼 Business',
  family: '👨‍👩‍👧 Family',
  other: '✨ Occasion',
}

const REFRESH_MS = 30_000

function dayLabel(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const nice = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
  const diff = Math.round((Date.UTC(y, m - 1, d) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  return diff === 0 ? `Today · ${nice}` : diff === 1 ? `Tomorrow · ${nice}` : nice
}

function dayTotals(items: Reservation[]): string {
  const live = items.filter((r) => r.status !== 'cancelled')
  const guests = live.reduce((n, r) => n + r.guests, 0)
  return `${live.length} ${live.length === 1 ? 'booking' : 'bookings'} · ${guests} ${guests === 1 ? 'guest' : 'guests'}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)))
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} days ago`
}

export function ReservationsPage() {
  const toast = useToast()
  const [view, setView] = useState<View>('upcoming')
  const [list, setList] = useState<ListResponse | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const lastPending = useRef<number | null>(null)

  const load = useCallback(
    async (quiet = false) => {
      try {
        const res = await api<ListResponse>(`/admin/reservations?view=${view}`)
        if (lastPending.current !== null && res.counts.pending > lastPending.current) toast('New booking request received')
        lastPending.current = res.counts.pending
        setList(res)
      } catch {
        if (!quiet) toast('Could not load reservations', 'error')
      }
    },
    [view, toast],
  )

  useEffect(() => {
    load()
    const id = window.setInterval(() => load(true), REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const update = async (r: Reservation, patch: Partial<Pick<Reservation, 'status' | 'admin_note'>>) => {
    setBusyId(r.id)
    try {
      const saved = await api<Reservation>(`/admin/reservations/${r.id}`, { method: 'PUT', body: patch })
      setList((l) => l && { ...l, data: l.data.map((x) => (x.id === r.id ? saved : x)) })
      if (patch.status) toast(`${r.reference} · ${STATUS_LABEL[patch.status]}`)
      load(true)
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (r: Reservation) => {
    if (!window.confirm(`Delete booking ${r.reference} for ${r.name}? This cannot be undone.`)) return
    await api(`/admin/reservations/${r.id}`, { method: 'DELETE' })
    setList((l) => l && { ...l, data: l.data.filter((x) => x.id !== r.id) })
    toast('Booking deleted')
    load(true)
  }

  const groups: [string, Reservation[]][] = []
  for (const r of list?.data ?? []) {
    const last = groups[groups.length - 1]
    if (last && last[0] === r.date) last[1].push(r)
    else groups.push([r.date, [r]])
  }

  const counts = list?.counts

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Reservations</h1>
          <p className="a-muted">Table requests from the menu. Call the guest, then mark the booking confirmed. This page refreshes on its own.</p>
        </div>
      </header>

      <div className="a-stats">
        {[
          ['New requests', counts?.pending],
          ['Bookings today', counts?.today],
          ['Guests today', counts?.today_guests],
        ].map(([label, value], i) => (
          <motion.div key={label} className={`a-stat${label === 'New requests' && Number(value) > 0 ? ' a-stat--alert' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="a-stat__value">{value ?? '–'}</span>
            <span className="a-stat__label">{label}</span>
          </motion.div>
        ))}
      </div>

      <div className="a-tabs" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.key} role="tab" aria-selected={view === v.key} className={`a-tab${view === v.key ? ' is-on' : ''}`} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {list && list.data.length === 0 && (
        <div className="a-card a-empty">
          <p>No bookings here yet.</p>
          <p className="a-muted">Guests book from the “Book a table” button on the menu, or from the QR code.</p>
        </div>
      )}

      {groups.map(([date, items]) => (
        <section key={date} className="a-res-day">
          <h2 className="a-res-day__title">
            {dayLabel(date, list!.today)}
            <span>
              {dayTotals(items)}
            </span>
          </h2>
          <AnimatePresence initial={false}>
            {items.map((r) => (
              <ReservationRow key={r.id} r={r} busy={busyId === r.id} onUpdate={(patch) => update(r, patch)} onDelete={() => remove(r)} />
            ))}
          </AnimatePresence>
        </section>
      ))}

      <BookingSettings />
    </div>
  )
}

function ReservationRow({ r, busy, onUpdate, onDelete }: { r: Reservation; busy: boolean; onUpdate: (p: Partial<Pick<Reservation, 'status' | 'admin_note'>>) => void; onDelete: () => void }) {
  const [note, setNote] = useState(r.admin_note ?? '')
  const digits = r.phone.replace(/[^\d]/g, '')
  const wa = digits.startsWith('0') ? `962${digits.slice(1)}` : digits

  return (
    <motion.article layout className={`a-res a-res--${r.status}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
      <div className="a-res__time">
        <strong>{formatTime(r.time)}</strong>
        <span>{r.guests} {r.guests === 1 ? 'guest' : 'guests'}</span>
      </div>

      <div className="a-res__main">
        <div className="a-res__top">
          <span className="a-res__name">{r.name}</span>
          <span className={`a-res__status a-res__status--${r.status}`}>{STATUS_LABEL[r.status]}</span>
          {r.occasion && <span className="a-res__tag">{OCCASION_LABEL[r.occasion] ?? r.occasion}</span>}
        </div>
        <div className="a-res__meta">
          <a href={`tel:${r.phone.replace(/\s/g, '')}`}>📞 {r.phone}</a>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
            WhatsApp ↗
          </a>
          <span>
            {r.reference} · {r.lang === 'ar' ? 'Arabic' : 'English'} · booked {ago(r.created_at)}
          </span>
        </div>
        {r.notes && <p className="a-res__notes">“{r.notes}”</p>}
        <input
          className="a-res__note"
          placeholder="Staff note (table number, deposit…) — saved when you leave the field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (r.admin_note ?? '') && onUpdate({ admin_note: note || null })}
        />
      </div>

      <div className="a-res__actions">
        {r.status !== 'confirmed' && r.status !== 'seated' && (
          <button className="a-btn a-btn--primary a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'confirmed' })}>
            Confirm
          </button>
        )}
        {r.status === 'confirmed' && (
          <button className="a-btn a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'seated' })}>
            Arrived
          </button>
        )}
        {r.status !== 'cancelled' ? (
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'cancelled' })}>
            Cancel
          </button>
        ) : (
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'pending' })}>
            Restore
          </button>
        )}
        <button className="a-link a-link--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </motion.article>
  )
}

const BOOKING_KEYS = ['reservations_enabled', 'reservation_open', 'reservation_last', 'reservation_interval', 'reservation_max_guests'] as const
type BookingKey = (typeof BOOKING_KEYS)[number]

function BookingSettings() {
  const toast = useToast()
  const [values, setValues] = useState<Record<BookingKey, string> | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Settings>('/admin/settings')
      .then((s) => setValues(Object.fromEntries(BOOKING_KEYS.map((k) => [k, String(s[k] ?? '')])) as Record<BookingKey, string>))
      .catch(() => {})
  }, [])

  if (!values) return null
  const set = (k: BookingKey, v: string) => setValues({ ...values, [k]: v })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await api('/admin/settings', { method: 'PUT', body: values })
      toast('Booking settings saved')
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-res-settings" onSubmit={save}>
      <div className="a-res-settings__head">
        <div>
          <h2 className="a-card__title">Booking settings</h2>
          <p className="a-muted">Which times guests can pick. A last time earlier than the first (e.g. 18:00 → 01:00) runs past midnight.</p>
        </div>
        <label className="a-res-settings__switch">
          <Switch checked={values.reservations_enabled !== '0'} onChange={(on) => set('reservations_enabled', on ? '1' : '0')} label="Online booking" />
          <span>{values.reservations_enabled !== '0' ? 'Online booking is on' : 'Online booking is off'}</span>
        </label>
      </div>
      <div className="a-grid-2 a-grid-4">
        <Field label="First booking time" error={errors.reservation_open?.[0]}>
          <input type="time" value={values.reservation_open} onChange={(e) => set('reservation_open', e.target.value)} />
        </Field>
        <Field label="Last booking time" error={errors.reservation_last?.[0]}>
          <input type="time" value={values.reservation_last} onChange={(e) => set('reservation_last', e.target.value)} />
        </Field>
        <Field label="Time steps" error={errors.reservation_interval?.[0]}>
          <select value={values.reservation_interval} onChange={(e) => set('reservation_interval', e.target.value)}>
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes</option>
            <option value="60">Every hour</option>
          </select>
        </Field>
        <Field label="Most guests per booking" hint="Bigger groups are asked to call" error={errors.reservation_max_guests?.[0]}>
          <input type="number" min={1} max={200} value={values.reservation_max_guests} onChange={(e) => set('reservation_max_guests', e.target.value)} />
        </Field>
      </div>
      <button className="a-btn a-btn--primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save booking settings'}
      </button>
    </form>
  )
}
