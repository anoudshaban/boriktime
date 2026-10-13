import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadAdminData, type AdminData } from './data'
import { useToast } from './ui'

const ACTIONS = [
  { to: '/admin/photos', title: 'Add food photos', text: 'Dish photos and the big section banners.', icon: '📷' },
  { to: '/admin/offers', title: 'Offers', text: 'Weekend deals, combos and launches — with start and end dates.', icon: '🏷️' },
  { to: '/admin/dishes', title: 'Dishes & prices', text: 'Edit names, prices, descriptions, tags; add or hide dishes.', icon: '🍽️' },
  { to: '/admin/categories', title: 'Sections', text: 'The Kitchen / The Café / Sweets and the tabs inside them.', icon: '🗂️' },
  { to: '/admin/settings', title: 'Restaurant info', text: 'Logo, welcome text, phone, address, opening hours.', icon: '🏠' },
  { to: '/admin/import', title: 'Import Excel', text: 'Update all names and prices from your spreadsheet.', icon: '📄' },
  { to: '/admin/account', title: 'Your account', text: 'Change the admin email and password.', icon: '🔒' },
]

export function Dashboard() {
  const toast = useToast()
  const [data, setData] = useState<AdminData | null>(null)

  useEffect(() => {
    loadAdminData()
      .then(setData)
      .catch(() => toast('Could not load the dashboard', 'error'))
  }, [toast])

  const products = data?.products ?? []
  const withPhoto = products.filter((p) => p.image).length
  const hidden = products.filter((p) => !p.is_available).length
  const groups = data?.categories.filter((c) => c.parent_id === null).length ?? 0
  const pct = products.length ? Math.round((withPhoto / products.length) * 100) : 0
  const s = data?.settings

  const checklist = [
    { done: products.length > 0, label: 'Menu imported from Excel', to: '/admin/import' },
    { done: products.length > 0 && withPhoto === products.length, label: `Add food photos (${products.length - withPhoto} missing)`, to: '/admin/photos' },
    { done: Boolean(s?.phone || s?.whatsapp), label: 'Add phone or WhatsApp', to: '/admin/settings' },
    { done: Boolean(s?.address_en || s?.address_ar), label: 'Add address and map link', to: '/admin/settings' },
    { done: Boolean(s?.hours_en || s?.hours_ar), label: 'Add opening hours', to: '/admin/settings' },
    { done: Boolean(s?.instagram), label: 'Add Instagram link', to: '/admin/settings' },
  ]

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Welcome back</h1>
          <p className="a-muted">Everything on the menu is managed from here. Changes go live immediately.</p>
        </div>
        <a className="a-btn a-btn--primary" href="/" target="_blank" rel="noreferrer">
          View live menu ↗
        </a>
      </header>

      <div className="a-stats">
        {[
          ['Dishes', products.length],
          ['Sections', (data?.sections.length ?? 0) + ` in ${groups} groups`],
          ['Hidden dishes', hidden],
          ['With photo', `${withPhoto} / ${products.length}`],
        ].map(([label, value], i) => (
          <motion.div key={label} className="a-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="a-stat__value">{data ? value : '–'}</span>
            <span className="a-stat__label">{label}</span>
          </motion.div>
        ))}
      </div>

      <div className="a-dash">
        <section className="a-card">
          <h2 className="a-card__title">Food photos</h2>
          <p className="a-muted">Photos make the biggest difference. Dishes without one show a porcelain plate illustration.</p>
          <div className="a-progress" aria-label={`${pct}% of dishes have a photo`}>
            <motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
          </div>
          <p className="a-progress__label">
            <strong>{pct}%</strong> of dishes have a photo
          </p>
          <Link to="/admin/photos" className="a-btn a-btn--primary">
            Upload photos
          </Link>
        </section>

        <section className="a-card">
          <h2 className="a-card__title">Getting started</h2>
          <ul className="a-checklist">
            {checklist.map((item) => (
              <li key={item.label} className={item.done ? 'is-done' : ''}>
                <span className="a-checklist__box">{item.done ? '✓' : ''}</span>
                {item.done ? <span>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="a-actions">
        {ACTIONS.map((action, i) => (
          <motion.div key={action.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}>
            <Link to={action.to} className="a-action">
              <span className="a-action__icon" aria-hidden="true">
                {action.icon}
              </span>
              <span className="a-action__title">{action.title}</span>
              <span className="a-action__text">{action.text}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
