import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { CategoryIcon, ChevronIcon, ClockIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import type { Group, Settings } from '../types'

const EASE = [0.2, 0.7, 0.3, 1] as const

type Props = { groups: Group[]; settings: Settings | null; firstVisit: boolean }

export function Home({ groups, settings, firstVisit }: Props) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  // Let the logo finish drawing before the rest of the page rises in.
  const base = firstVisit && !reduce ? 1.5 : 0
  const rise = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: base + delay, ease: EASE } }

  const local = (en?: string | null, ar?: string | null) => (lang === 'ar' ? ar || en : en || ar) ?? ''
  const about = local(settings?.about_en, settings?.about_ar)
  const motto = local(settings?.motto_en, settings?.motto_ar)
  const name = lang === 'ar' ? settings?.name_ar : settings?.name_en

  return (
    <main className="view container home">
      <section className="brief">
        <motion.div className="brief__logo" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Logo motionMode={firstVisit ? 'intro' : 'none'} title={settings?.name_en ?? 'Börek Time'} />
        </motion.div>
        {about && <motion.p {...rise(0)}>{about}</motion.p>}
        {motto && (
          <motion.p className="brief__motto" {...rise(0.08)}>
            {motto}
          </motion.p>
        )}
      </section>

      <motion.div className="rule" {...rise(0.16)}>
        <span>{t('theMenu')}</span>
      </motion.div>

      <nav className="groups" aria-label={t('menu')}>
        {groups.map((group, i) => (
          <motion.div key={group.slug} {...rise(0.22 + i * 0.08)}>
            <Link to={`/menu/${group.slug}`} className="group">
              <span className="ico">
                <CategoryIcon name={group.icon} strokeWidth={1.4} />
              </span>
              <span className="group__txt">
                <span className="group__name">{pick(group.name)}</span>
                {pick(group.description) && <span className="group__desc">{pick(group.description)}</span>}
              </span>
              <ChevronIcon size={16} className="group__chev flip-fwd" />
            </Link>
          </motion.div>
        ))}
      </nav>

      <motion.footer className="foot" {...rise(0.3 + groups.length * 0.08)}>
        <Contact settings={settings} />
        <p className="foot__brand">
          {name} · {t('digitalMenu')}
        </p>
      </motion.footer>
    </main>
  )
}

function Contact({ settings: s }: { settings: Settings | null }) {
  const { lang, t } = useI18n()
  if (!s) return null

  const local = (en: string | null, ar: string | null) => (lang === 'ar' ? ar || en : en || ar)
  const whatsapp = s.whatsapp?.replace(/[^\d]/g, '')
  const items: { key: string; icon: ReactNode; node: ReactNode }[] = []

  const address = local(s.address_en, s.address_ar)
  if (address)
    items.push({
      key: 'address',
      icon: <PinIcon size={16} />,
      node: s.map_url ? (
        <a href={s.map_url} target="_blank" rel="noreferrer">
          {address}
        </a>
      ) : (
        address
      ),
    })
  const hours = local(s.hours_en, s.hours_ar)
  if (hours) items.push({ key: 'hours', icon: <ClockIcon size={16} />, node: <span className="pre">{hours}</span> })
  if (s.phone)
    items.push({
      key: 'phone',
      icon: <PhoneIcon size={16} />,
      node: (
        <a href={`tel:${s.phone.replace(/\s/g, '')}`} dir="ltr">
          {s.phone}
        </a>
      ),
    })

  const socials = [
    s.instagram && { href: s.instagram, label: 'Instagram', icon: <InstagramIcon size={18} /> },
    s.facebook && { href: s.facebook, label: 'Facebook', icon: <FacebookIcon size={18} /> },
    whatsapp && { href: `https://wa.me/${whatsapp}`, label: 'WhatsApp', icon: <WhatsappIcon size={18} /> },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[]

  const note = local(s.note_en, s.note_ar)
  if (!items.length && !socials.length && !note) return null

  return (
    <div className="contact">
      {items.length > 0 && (
        <ul className="contact__list" aria-label={t('visitUs')}>
          {items.map((item) => (
            <li key={item.key}>
              {item.icon}
              {item.node}
            </li>
          ))}
        </ul>
      )}
      {socials.length > 0 && (
        <ul className="contact__socials">
          {socials.map((social) => (
            <li key={social.label}>
              <a href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} className="round-btn">
                {social.icon}
              </a>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="contact__note">{note}</p>}
    </div>
  )
}
