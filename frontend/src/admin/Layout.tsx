import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { api } from '../lib/api'
import { useAuth } from './AdminApp'

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
  const pending = usePendingBookings(location.pathname)

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

/** New booking requests, for the badge in the sidebar (checked every minute and on every page change). */
function usePendingBookings(pathname: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const check = () =>
      api<{ counts: { pending: number } }>('/admin/reservations?view=today')
        .then((r) => setCount(r.counts.pending))
        .catch(() => {})
    check()
    const id = window.setInterval(check, 60_000)
    return () => window.clearInterval(id)
  }, [pathname])

  return count
}
