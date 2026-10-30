import { motion, useReducedMotion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { CalendarIcon, CategoryIcon, ChevronIcon, ClockIcon, DeliveryIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, waNumber } from '../lib/text'
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

  const [delivery, pickup] = useMemo(() => {
    const all = [...dishes.values()]
    return [all.some((d) => d.product.delivery), all.some((d) => d.product.pickup)]
  }, [dishes])
  const deliveryOn = delivery || pickup

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
                <DeliveryIcon size={15} /> {t(delivery && pickup ? 'deliveryPickup' : delivery ? 'delivery' : 'pickup')}
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
  const whatsapp = waNumber(s.whatsapp) ?? waNumber(s.delivery_whatsapp)
  const address = local(s.address_en, s.address_ar)
  const hours = local(s.hours_en, s.hours_ar)
  const tel = `tel:${(s.phone ?? '').replace(/\s/g, '')}`

  // One row of round buttons; each appears once it is filled in Admin → Restaurant info.
  const links = [
    s.phone && { key: 'call', href: tel, label: t('call'), icon: <PhoneIcon size={19} />, external: false },
    whatsapp && { key: 'whatsapp', href: `https://wa.me/${whatsapp}`, label: t('whatsapp'), icon: <WhatsappIcon size={19} />, external: true },
    s.instagram && { key: 'instagram', href: s.instagram, label: t('instagram'), icon: <InstagramIcon size={19} />, external: true },
    s.facebook && { key: 'facebook', href: s.facebook, label: t('facebook'), icon: <FacebookIcon size={19} />, external: true },
    s.map_url && { key: 'map', href: s.map_url, label: t('location'), icon: <PinIcon size={19} />, external: true },
  ].filter(Boolean) as { key: string; href: string; label: string; icon: ReactNode; external: boolean }[]
  const note = local(s.note_en, s.note_ar)

  return (
    <footer className="st-foot">
      {(links.length > 0 || address || hours) && (
        <section className="st-foot__card" aria-label={t('getInTouch')}>
          <p className="st-foot__title">{t('getInTouch')}</p>
          {links.length > 0 && (
            <ul className="st-foot__links">
              {links.map((l) => (
                <li key={l.key}>
                  <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noreferrer' } : {})} className="st-foot__link">
                    <span className="st-foot__circle">{l.icon}</span>
                    <span className="st-foot__name">{l.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {(address || hours) && (
            <div className="st-foot__lines">
              {address && (
                <p>
                  <PinIcon size={14} /> {address}
                </p>
              )}
              {hours && (
                <p>
                  <ClockIcon size={14} /> <span className="pre">{hours}</span>
                </p>
              )}
            </div>
          )}
        </section>
      )}
      {note && <p className="st-foot__note">{note}</p>}
      <p className="st-foot__brand">
        {lang === 'ar' ? s.name_ar : s.name_en} · {t('digitalMenu')}
      </p>
      <PhotoCredits />
    </footer>
  )
}
