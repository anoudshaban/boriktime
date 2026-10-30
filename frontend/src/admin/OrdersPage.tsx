import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, auth } from '../lib/api'
import { useToast } from './ui'

export type OrderStatus = 'new' | 'confirmed' | 'done' | 'cancelled'
type OrderType = 'delivery' | 'pickup'

type OrderItem = { id: number; name_en: string; name_ar: string; size_en: string | null; size_ar: string | null; qty: number; price: number; total: number }

export type Order = {
  id: number
  reference: string
  type: OrderType
  status: OrderStatus
  name: string
  phone: string
  address: string | null
  pickup_time: string | null
  notes: string | null
  items: OrderItem[]
  total: number
  lang: 'en' | 'ar'
  admin_note: string | null
  created_at: string
}

type Totals = { orders: number; total: number }
type TopDish = { name_en: string; name_ar: string; size_en: string | null; qty: number; total: number }
type ListResponse = { data: Order[]; month: string; summary: { delivery: Totals; pickup: Totals; all: Totals }; top: TopDish[]; counts: { new: number } }

const STATUS_LABEL: Record<OrderStatus, string> = { new: 'New order', confirmed: 'Confirmed', done: 'Done', cancelled: 'Cancelled' }
// Same colours as the reservation cards.
const STATUS_CLASS: Record<OrderStatus, string> = { new: 'pending', confirmed: 'confirmed', done: 'seated', cancelled: 'cancelled' }

const REFRESH_MS = 30_000

/** Fired after an order changes or a new one arrives, so the list and the sidebar badge reload. */
export const ORDERS_CHANGED = 'bt:orders-changed'

const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Amman', year: 'numeric', month: '2-digit' }).format(new Date())
const jd = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(2)} JD`

function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)))
}

function when(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Amman' }).format(new Date(iso))
}

/**
 * Delivery and pick-up orders sent from the menu, one month at a time: the month's numbers
 * (cancelled orders not counted), best-selling dishes, an Excel download and each order with
 * confirm / done / cancel. Refreshes on its own.
 */
export function OrdersPage() {
  const toast = useToast()
  const [month, setMonth] = useState(thisMonth)
  const [type, setType] = useState<'' | OrderType>('')
  const [list, setList] = useState<ListResponse | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const query = `month=${month}${type ? `&type=${type}` : ''}`

  const load = useCallback(
    async (quiet = false) => {
      try {
        setList(await api<ListResponse>(`/admin/orders?${query}`))
      } catch {
        if (!quiet) toast('Could not load orders', 'error')
      }
    },
    [query, toast],
  )

  useEffect(() => {
    load()
    const id = window.setInterval(() => load(true), REFRESH_MS)
    const onChanged = () => load(true)
    window.addEventListener(ORDERS_CHANGED, onChanged)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(ORDERS_CHANGED, onChanged)
    }
  }, [load])

  const update = async (o: Order, patch: Partial<Pick<Order, 'status' | 'admin_note'>>) => {
    setBusyId(o.id)
    try {
      const saved = await api<Order>(`/admin/orders/${o.id}`, { method: 'PUT', body: patch })
      setList((l) => l && { ...l, data: l.data.map((x) => (x.id === o.id ? saved : x)) })
      if (patch.status) {
        toast(`${o.reference} · ${STATUS_LABEL[patch.status]}`)
        load(true) // the month's numbers change
      }
      window.dispatchEvent(new Event(ORDERS_CHANGED))
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (o: Order) => {
    if (!window.confirm(`Delete order ${o.reference} from ${o.name}? This cannot be undone.`)) return
    await api(`/admin/orders/${o.id}`, { method: 'DELETE' })
    toast('Order deleted')
    load(true)
    window.dispatchEvent(new Event(ORDERS_CHANGED))
  }

  // The file needs the login token, so it is fetched and handed to the browser as a download.
  const download = async () => {
    try {
      const res = await fetch(`/api/admin/orders/export?${query}`, { headers: { Authorization: `Bearer ${auth.token}` } })
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const a = Object.assign(document.createElement('a'), { href: url, download: `borektime-orders-${month}.csv` })
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast('Download failed', 'error')
    }
  }

  const s = list?.summary

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Orders</h1>
          <p className="a-muted">Delivery and pick-up orders from the menu, saved when the guest sends them on WhatsApp. Confirm them, mark them done, or cancel. Cancelled orders don’t count in the totals.</p>
        </div>
        <button className="a-btn a-btn--ghost" onClick={download}>
          ⬇ Download Excel
        </button>
      </header>

      <div className="a-orders__bar">
        <label className="a-orders__month">
          <span>Month</span>
          <input type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
        <div className="a-tabs" role="tablist">
          {(
            [
              ['', 'All'],
              ['delivery', 'Delivery'],
              ['pickup', 'Pick-up'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={type === key} className={`a-tab${type === key ? ' is-on' : ''}`} onClick={() => setType(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="a-stats">
        {[
          ['Delivery orders', s?.delivery.orders, s && jd(s.delivery.total)],
          ['Pick-up orders', s?.pickup.orders, s && jd(s.pickup.total)],
          ['All orders', s?.all.orders, s && jd(s.all.total)],
          ['New, to confirm', list?.counts.new, 'all months'],
        ].map(([label, value, sub], i) => (
          <motion.div key={String(label)} className={`a-stat${label === 'New, to confirm' && Number(value) > 0 ? ' a-stat--alert' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="a-stat__value">{value ?? '–'}</span>
            <span className="a-stat__label">{label}</span>
            {sub && <span className="a-stat__sub">{sub}</span>}
          </motion.div>
        ))}
      </div>

      {list && list.top.length > 0 && (
        <section className="a-card a-orders__top">
          <h2 className="a-card__title">Best sellers · {monthName(list.month)}</h2>
          <ol>
            {list.top.map((d) => (
              <li key={`${d.name_en}|${d.size_en ?? ''}`}>
                <span>
                  {d.name_en}
                  {d.size_en && <small> · {d.size_en}</small>}
                  <small className="a-muted" lang="ar">
                    {' '}
                    {d.name_ar}
                  </small>
                </span>
                <strong>× {d.qty}</strong>
                <span className="a-muted">{jd(d.total)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {list && list.data.length === 0 && (
        <div className="a-card a-empty">
          <p>No orders in {monthName(list.month)}{type ? ` for ${type === 'delivery' ? 'delivery' : 'pick-up'}` : ''}.</p>
          <p className="a-muted">Guests order from the “Delivery / Pick up” button on the menu.</p>
        </div>
      )}

      <div className="a-res-day">
        <AnimatePresence initial={false}>
          {list?.data.map((o) => (
            <OrderRow key={o.id} o={o} busy={busyId === o.id} onUpdate={(patch) => update(o, patch)} onDelete={() => remove(o)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function OrderRow({ o, busy, onUpdate, onDelete }: { o: Order; busy: boolean; onUpdate: (p: Partial<Pick<Order, 'status' | 'admin_note'>>) => void; onDelete: () => void }) {
  const [note, setNote] = useState(o.admin_note ?? '')
  const wa = o.phone.startsWith('0') ? `962${o.phone.slice(1)}` : o.phone

  return (
    <motion.article layout className={`a-res a-res--${STATUS_CLASS[o.status]} a-order`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
      <div className="a-res__time">
        <strong>{jd(o.total)}</strong>
        <span>{o.type === 'delivery' ? '🛵 Delivery' : '🛍 Pick-up'}</span>
      </div>

      <div className="a-res__main">
        <div className="a-res__top">
          <span className="a-res__name">{o.name}</span>
          <span className={`a-res__status a-res__status--${STATUS_CLASS[o.status]}`}>{STATUS_LABEL[o.status]}</span>
          <span className="a-res__tag">{o.type === 'delivery' ? `📍 ${o.address ?? ''}` : `🕒 ${o.pickup_time ?? 'As soon as possible'}`}</span>
        </div>
        <ul className="a-order__items">
          {o.items.map((i, n) => (
            <li key={n}>
              <strong>{i.qty} ×</strong> {i.name_en}
              {i.size_en && <span className="a-muted"> · {i.size_en}</span>}
              <span className="a-muted"> — {jd(i.total)}</span>
            </li>
          ))}
        </ul>
        <div className="a-res__meta">
          <a href={`tel:${o.phone}`}>📞 {o.phone}</a>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
            WhatsApp ↗
          </a>
          <span>
            {o.reference} · {when(o.created_at)} · {o.lang === 'ar' ? 'Arabic' : 'English'}
          </span>
        </div>
        {o.notes && <p className="a-res__notes">“{o.notes}”</p>}
        <input
          className="a-res__note"
          placeholder="Staff note (driver, paid…) — saved when you leave the field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (o.admin_note ?? '') && onUpdate({ admin_note: note || null })}
        />
      </div>

      <div className="a-res__actions">
        {o.status === 'new' && (
          <button className="a-btn a-btn--primary a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'confirmed' })}>
            Confirm
          </button>
        )}
        {(o.status === 'new' || o.status === 'confirmed') && (
          <button className="a-btn a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'done' })}>
            Done
          </button>
        )}
        {o.status !== 'cancelled' ? (
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'cancelled' })}>
            Cancel
          </button>
        ) : (
          <button className="a-btn a-btn--ghost a-btn--sm" disabled={busy} onClick={() => onUpdate({ status: 'new' })}>
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
