import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { api } from '../lib/api'
import { useAuth } from './AdminApp'
import { BOOKINGS_CHANGED } from './ReservationsPage'
import { useToast } from './ui'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/reservations', label: 'Reservations' },
  { to: '/admin/dishes', label: 'Dishes & prices' },
  { to: '/admin/photos', label: 'Photos' },
  { to: '/admin/offers', label: 'Offers' },
  { to: '/admin/categories', label: 'Sections' },
  { to: '/admin/settings', label: 'Restaurant info' },
  { to: '/admin/import', label: 'Import Excel' },
  { to: '/admin/qr', label: 'QR code' },
  { to: '/admin/account', label: 'Account' },
]

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const pending = usePendingBookings()

  return (
    <div className="admin">
      <aside className="a-side">
        <div className="a-side__brand">
          <Logo className="a-side__logo" />
          <span className="a-side__badge">Admin</span>
        </div>

        <nav className="a-nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `a-nav__link${isActive ? ' is-active' : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="a-nav-pill" className="a-nav__pill" transition={{ type: 'spring', damping: 30, stiffness: 380 }} />}
                  <span>
                    {link.label}
                    {link.to === '/admin/reservations' && pending > 0 && <span className="a-nav__count">{pending}</span>}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="a-side__foot">
          <a className="a-btn a-btn--ghost a-btn--block" href="/" target="_blank" rel="noreferrer">
            View live menu ↗
          </a>
          <p className="a-side__user">{user?.email}</p>
          <button className="a-link" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="a-main">
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}

/** Soft two-note chime for a new booking (Web Audio, nothing to download). */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const at = ctx.currentTime + i * 0.18
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.55)
    })
    window.setTimeout(() => ctx.close(), 1200)
  } catch {
    /* audio blocked: the toast and badge still show */
  }
}

/**
 * New booking requests, checked every 20 seconds on every admin page: drives the sidebar
 * badge and the tab title, and chimes + toasts when a new request arrives.
 */
function usePendingBookings(): number {
  const toast = useToast()
  const [count, setCount] = useState(0)
  const last = useRef<number | null>(null)

  useEffect(() => {
    const check = () =>
      api<{ counts: { pending: number } }>('/admin/reservations?view=today')
        .then((r) => {
          const pending = r.counts.pending
          const before = last.current
          last.current = pending
          if (before !== null && pending > before) {
            chime()
            toast(pending - before === 1 ? '🔔 New booking request' : `🔔 ${pending - before} new booking requests`)
            window.dispatchEvent(new Event(BOOKINGS_CHANGED))
          }
          setCount(pending)
        })
        .catch(() => {})
    check()
    const id = window.setInterval(check, 20_000)
    window.addEventListener(BOOKINGS_CHANGED, check)
    return () => {
      window.clearInterval(id)
      window.removeEventListener(BOOKINGS_CHANGED, check)
    }
  }, [toast])

  useEffect(() => {
    document.title = count > 0 ? `(${count}) Börek Time — Admin` : 'Börek Time — Admin'
  }, [count])

  return count
}
