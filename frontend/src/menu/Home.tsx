import { motion, useReducedMotion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { CalendarIcon, CategoryIcon, ChevronIcon, ClockIcon, DeliveryIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Group, Settings } from '../types'
import { PhotoCredits } from './Credits'
import { dishPath, useMenuData } from './menuData'
import { OffersSlider } from './Offers'
import { DishPlate, Price } from './parts'

const EASE = [0.22, 1, 0.36, 1] as const

/** Gentle rise used for everything that enters the page. */
export const rise = (delay = 0, reduce: boolean | null = false) =>
  reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: EASE } }

type Props = { groups: Group[]; settings: Settings | null; firstVisit: boolean }

/** First photo we can find for a group: its own, a section banner, or a dish. */
export function groupImage(group: Group): string | null {
  if (group.image) return group.image
  for (const s of group.sections) if (s.image) return s.image
  for (const s of group.sections) for (const p of s.products) if (p.image) return p.image
  return null
}

export function Home({ groups, settings, firstVisit }: Props) {
  const { lang, pick, t } = useI18n()
  const { dishes, offers } = useMenuData()
  const reduce = useReducedMotion()
  const base = firstVisit && !reduce ? 1.6 : 0.05

  const about = (lang === 'ar' ? settings?.about_ar || settings?.about_en : settings?.about_en || settings?.about_ar) ?? ''
  const motto = (lang === 'ar' ? settings?.motto_ar || settings?.motto_en : settings?.motto_en || settings?.motto_ar) ?? ''

  const deliveryOn = useMemo(() => [...dishes.values()].some((d) => d.product.delivery), [dishes])

  const picks = useMemo(() => {
    const all = [...dishes.values()]
    const featured = all.filter((d) => d.product.featured)
    return (featured.length >= 3 ? featured : [...featured, ...all.filter((d) => !d.product.featured && d.product.image)]).slice(0, 8)
  }, [dishes])

  return (
    <main className="st st-home">
      <section className="st-brief">
        <motion.div className="st-brief__logo" {...rise(0, reduce)}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={settings.name_en} className="brand-img" />
          ) : (
            <Logo motionMode={firstVisit ? 'intro' : 'none'} title={settings?.name_en ?? 'Börek Time'} />
          )}
        </motion.div>
        {about && (
          <motion.p className="st-brief__about" {...rise(base, reduce)}>
            {about}
          </motion.p>
        )}
        {motto && (
          <motion.p className="st-brief__motto" {...rise(base + 0.1, reduce)}>
            {motto}
          </motion.p>
        )}
        {(settings?.reservations_enabled !== '0' || deliveryOn) && (
          <motion.div className="st-brief__links" {...rise(base + 0.15, reduce)}>
            {settings?.reservations_enabled !== '0' && (
              <Link to="/reserve" className="st-brief__book">
                <CalendarIcon size={15} /> {t('bookTable')}
              </Link>
            )}
            {deliveryOn && (
              <Link to="/delivery" className="st-brief__book">
                <DeliveryIcon size={15} /> {t('delivery')}
              </Link>
            )}
          </motion.div>
        )}
      </section>

      <motion.div className="st-rule" {...rise(base + 0.2, reduce)}>
        <span>{t('theMenu')}</span>
      </motion.div>

      <nav className="st-groups" aria-label={t('menu')}>
        {groups.map((g, i) => {
          const count = g.sections.reduce((n, s) => n + s.products.length, 0)
          return (
            <motion.div key={g.slug} {...rise(base + 0.28 + i * 0.09, reduce)}>
              <Link to={`/menu/${g.slug}`} className="st-group">
                <span className="st-group__ico">
                  <CategoryIcon name={g.icon} strokeWidth={1.3} />
                </span>
                <span className="st-group__txt">
                  <span className="st-group__name">{pick(g.name)}</span>
                  <span className="st-group__sub">
                    {pick(g.description)}
                    {pick(g.description) ? ' · ' : ''}
                    {formatInt(count, lang)} {t('items')}
                  </span>
                </span>
                <ChevronIcon size={16} className="st-group__chev flip-fwd" />
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {offers.length > 0 && (
        <motion.div className="st-offers" {...rise(base + 0.5, reduce)}>
          <OffersSlider settings={settings} />
        </motion.div>
      )}

      {picks.length > 0 && (
        <section className="st-picks">
          <div className="st-rule">
            <span>{t('chefsPicks')}</span>
          </div>
          <div className="st-picks__track">
            {picks.map((ref, i) => (
              <motion.div key={ref.product.id} className="st-picks__item" initial={reduce ? false : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: Math.min(i, 4) * 0.08, ease: EASE }}>
                <Link to={dishPath(ref)} state={{ modal: true }} className="st-card">
                  <DishPlate product={ref.product} icon={ref.section.icon} />
                  <span className="st-card__name">{pick(ref.product.name)}</span>
                  <Price value={ref.product.price} sale={ref.product.sale_price} settings={null} className="st-card__price" from={!!ref.product.sizes?.length} />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <SiteFooter settings={settings} />
    </main>
  )
}

/* ---------------------------------------------------------------- */

export function SiteFooter({ settings: s }: { settings: Settings | null }) {
  const { lang, t } = useI18n()
  if (!s) return null
  const local = (en: string | null, ar: string | null) => (lang === 'ar' ? ar || en : en || ar)
  const whatsapp = s.whatsapp?.replace(/[^\d]/g, '')
  const items: { key: string; icon: ReactNode; label: string; node: ReactNode }[] = []

  const address = local(s.address_en, s.address_ar)
  if (address)
    items.push({
      key: 'address',
      icon: <PinIcon size={16} />,
      label: t('visitUs'),
      node: s.map_url ? (
        <a href={s.map_url} target="_blank" rel="noreferrer">
          {address}
        </a>
      ) : (
        address
      ),
    })
  const hours = local(s.hours_en, s.hours_ar)
  if (hours) items.push({ key: 'hours', icon: <ClockIcon size={16} />, label: t('openingHours'), node: <span className="pre">{hours}</span> })
  if (s.phone)
    items.push({
      key: 'phone',
      icon: <PhoneIcon size={16} />,
      label: t('getInTouch'),
      node: (
        <a href={`tel:${s.phone.replace(/\s/g, '')}`} dir="ltr">
          {s.phone}
        </a>
      ),
    })

  const socials = [
    s.instagram && { href: s.instagram, label: 'Instagram', icon: <InstagramIcon size={17} /> },
    s.facebook && { href: s.facebook, label: 'Facebook', icon: <FacebookIcon size={17} /> },
    whatsapp && { href: `https://wa.me/${whatsapp}`, label: 'WhatsApp', icon: <WhatsappIcon size={17} /> },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[]
  const note = local(s.note_en, s.note_ar)

  return (
    <footer className="st-foot">
      {items.length > 0 && (
        <ul className="st-foot__info">
          {items.map((it) => (
            <li key={it.key}>
              <span className="st-foot__ico">{it.icon}</span>
              <span>
                <span className="st-foot__label">{it.label}</span>
                {it.node}
              </span>
            </li>
          ))}
        </ul>
      )}
      {socials.length > 0 && (
        <ul className="st-foot__socials">
          {socials.map((x) => (
            <li key={x.label}>
              <a href={x.href} target="_blank" rel="noreferrer" aria-label={x.label} className="round-btn">
                {x.icon}
              </a>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="st-foot__note">{note}</p>}
      <p className="st-foot__brand">
        {lang === 'ar' ? s.name_ar : s.name_en} · {t('digitalMenu')}
      </p>
      <PhotoCredits />
    </footer>
  )
}
