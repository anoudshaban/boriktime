import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { BookIcon, CalendarIcon, ChevronIcon } from '../components/icons'
import { useI18n, type StringKey } from '../lib/i18n'
import type { Settings } from '../types'
import { rise, SiteFooter } from './Home'

type Choice = { to: string; icon: ReactNode; title: StringKey; sub: StringKey }

/**
 * Where the table QR code lands: the logo and two big choices — the menu or a booking.
 */
export function Gate({ settings }: { settings: Settings | null }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const bookingOn = settings?.reservations_enabled !== '0'

  const choices: Choice[] = [
    { to: '/', icon: <BookIcon />, title: 'menu', sub: 'gateMenuSub' },
    ...(bookingOn ? [{ to: '/reserve', icon: <CalendarIcon />, title: 'bookTable', sub: 'gateBookSub' } satisfies Choice] : []),
  ]

  return (
    <main className="st st-home st-gate">
      <section className="st-brief">
        <motion.div className="st-brief__logo" {...rise(0, reduce)}>
          {settings?.logo_url ? <img src={settings.logo_url} alt={settings.name_en} className="brand-img" /> : <Logo motionMode="intro" title={settings?.name_en ?? 'Börek Time'} />}
        </motion.div>
        <motion.p className="st-eyebrow" {...rise(0.15, reduce)}>
          {t('welcome')}
        </motion.p>
      </section>

      <nav className="st-gate__choices">
        {choices.map((c, i) => (
          <motion.div key={c.to} {...rise(0.32 + i * 0.1, reduce)}>
            <Link to={c.to} className={`st-group st-gate__choice${i === 0 ? '' : ' st-gate__choice--alt'}`}>
              <span className="st-group__ico">{c.icon}</span>
              <span className="st-group__txt">
                <span className="st-group__name">{t(c.title)}</span>
                <span className="st-group__sub">{t(c.sub)}</span>
              </span>
              <ChevronIcon size={16} className="st-group__chev flip-fwd" />
            </Link>
          </motion.div>
        ))}
      </nav>

      <SiteFooter settings={settings} />
    </main>
  )
}
