import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { CategoryIcon, ChevronIcon, ClockIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n, type StringKey } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Group, Settings } from '../types'
import { PhotoCredits } from './Credits'
import { dishPath, useMenuData, type DishRef } from './menuData'
import { OffersSlider } from './Offers'
import { DishMedia, Price } from './parts'

const EASE = [0.2, 0.7, 0.3, 1] as const

type Props = { groups: Group[]; settings: Settings | null; firstVisit: boolean }

/** First photo we can find for a group: its own, a section banner, or a dish. */
export function groupImage(group: Group): string | null {
  if (group.image) return group.image
  for (const s of group.sections) if (s.image) return s.image
  for (const s of group.sections) for (const p of s.products) if (p.image) return p.image
  return null
}

export function Home({ groups, settings, firstVisit }: Props) {
  const { dishes, offers } = useMenuData()

  // Photos for the hero: chef's picks first, then anything else with a photo.
  const all = useMemo(() => [...dishes.values()], [dishes])
  const heroSlides = useMemo(() => {
    const withImg = all.filter((d) => d.product.image)
    const picks = [...withImg.filter((d) => d.product.featured), ...withImg.filter((d) => !d.product.featured)]
    return picks.slice(0, 6).map((d) => d.product.image as string)
  }, [all])
  const signatures = useMemo(() => {
    const featured = all.filter((d) => d.product.featured)
    const extra = all.filter((d) => !d.product.featured && d.product.image)
    return [...featured, ...extra].slice(0, 10)
  }, [all])

  return (
    <main className="home">
      <Hero slides={heroSlides} settings={settings} firstVisit={firstVisit} hasOffers={offers.length > 0} />
      <Marquee names={all.map((d) => d.product.name)} />

      {offers.length > 0 && (
        <div id="offers" className="container home-offers">
          <OffersSlider settings={settings} />
        </div>
      )}

      <section id="menu-groups" className="container home-sec">
        <SectionHead eyebrowKey="theMenu" titleKey="chooseTable" subKey="chooseTableSub" />
        <div className="gcards">
          {groups.map((g, i) => (
            <GroupCard key={g.slug} group={g} index={i} />
          ))}
        </div>
      </section>

      {signatures.length > 0 && <Signatures refs={signatures} settings={settings} />}

      <SiteFooter settings={settings} />
    </main>
  )
}

/* ---------------------------------------------------------------- */

function Hero({ slides, settings, firstVisit, hasOffers }: { slides: string[]; settings: Settings | null; firstVisit: boolean; hasOffers: boolean }) {
  const { lang, t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '22%'])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const lift = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80])

  useEffect(() => {
    if (slides.length < 2 || reduce) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000)
    return () => window.clearInterval(id)
  }, [slides.length, reduce])

  const base = firstVisit && !reduce ? 1.4 : 0.1
  const about = (lang === 'ar' ? settings?.about_ar || settings?.about_en : settings?.about_en || settings?.about_ar) ?? ''
  const motto = (lang === 'ar' ? settings?.motto_ar || settings?.motto_en : settings?.motto_en || settings?.motto_ar) ?? ''
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__bg" style={{ y: bgY }} aria-hidden="true">
        <AnimatePresence initial={false}>
          {slides.length > 0 && (
            <motion.img
              key={slides[index]}
              src={slides[index]}
              alt=""
              className="hero__img"
              initial={{ opacity: 0, scale: 1.18 }}
              animate={{ opacity: 1, scale: 1.04 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.6 }, scale: { duration: 7.5, ease: 'linear' } }}
            />
          )}
        </AnimatePresence>
        <div className="hero__veil" />
        <div className="hero__dust">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${-(i * 1.7)}s`, animationDuration: `${12 + (i % 5) * 3}s` }} />
          ))}
        </div>
      </motion.div>

      <motion.div className="hero__content container" style={{ opacity: fade, y: lift }}>
        <motion.p className="hero__eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: base * 0.3 }}>
          {lang === 'ar' ? settings?.tagline_ar : settings?.tagline_en}
        </motion.p>

        <div className="hero__logo">
          {settings?.logo_url ? (
            <motion.img src={settings.logo_url} alt={settings.name_en} className="brand-img" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} />
          ) : (
            <Logo motionMode={firstVisit ? 'intro' : 'idle'} title={settings?.name_en ?? 'Börek Time'} />
          )}
        </div>

        {about && (
          <motion.p className="hero__about" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: base + 0.1, ease: EASE }}>
            {about}
          </motion.p>
        )}
        {motto && (
          <motion.p className="hero__motto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: base + 0.3 }}>
            {motto}
          </motion.p>
        )}

        <motion.div className="hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: base + 0.45, ease: EASE }}>
          <button className="btn-gold" onClick={() => go('menu-groups')}>
            {t('viewMenu')}
            <ChevronIcon size={16} className="flip-fwd" />
          </button>
          {hasOffers && (
            <button className="btn-ghost" onClick={() => go('offers')}>
              {t('todaysOffers')}
            </button>
          )}
        </motion.div>
      </motion.div>

      {slides.length > 1 && (
        <div className="hero__dots" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s} className={i === index ? 'is-on' : ''} />
          ))}
        </div>
      )}

      <button className="hero__scroll" onClick={() => go('menu-groups')} aria-label={t('scroll')}>
        <span>{t('scroll')}</span>
        <i />
      </button>
    </section>
  )
}

function Marquee({ names }: { names: { en: string; ar: string }[] }) {
  const { lang } = useI18n()
  const words = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const n of names) {
      const w = n[lang].replace(/\s*[(/].*$/, '').trim()
      if (w && w.length < 28 && !seen.has(w)) {
        seen.add(w)
        out.push(w)
      }
    }
    return out.slice(0, 24)
  }, [names, lang])
  if (!words.length) return null
  const row = (
    <div className="marquee__row">
      {words.map((w, i) => (
        <span key={i}>
          {w}
          <i aria-hidden="true">◆</i>
        </span>
      ))}
    </div>
  )
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row}
        {row}
      </div>
    </div>
  )
}

export function SectionHead({ eyebrowKey, titleKey, subKey }: { eyebrowKey: StringKey; titleKey: StringKey; subKey?: StringKey }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  return (
    <motion.header
      className="shead"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <span className="shead__eyebrow">{t(eyebrowKey)}</span>
      <h2 className="shead__title">{t(titleKey)}</h2>
      {subKey && <p className="shead__sub">{t(subKey)}</p>}
    </motion.header>
  )
}

function GroupCard({ group, index }: { group: Group; index: number }) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const img = groupImage(group)
  const dishes = group.sections.reduce((n, s) => n + s.products.length, 0)
  const num = formatInt(index + 1, lang)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay: index * 0.12, ease: EASE }}
    >
      <Link to={`/menu/${group.slug}`} className="gcard">
        {img ? <img className="gcard__img" src={img} alt="" loading="lazy" /> : <span className="gcard__img gcard__img--empty" />}
        <span className="gcard__veil" />
        <span className="gcard__num">{(lang === 'ar' ? '٠' : '0') + num}</span>
        <span className="gcard__icon">
          <CategoryIcon name={group.icon} strokeWidth={1.3} />
        </span>
        <span className="gcard__body">
          <span className="gcard__name">{pick(group.name)}</span>
          {pick(group.description) && <span className="gcard__desc">{pick(group.description)}</span>}
          <span className="gcard__meta">
            {group.sections.length > 1 && `${formatInt(group.sections.length, lang)} ${t('sectionsWord')} · `}
            {formatInt(dishes, lang)} {t('items')}
          </span>
        </span>
        <span className="gcard__go">
          <ChevronIcon size={18} className="flip-fwd" />
        </span>
      </Link>
    </motion.div>
  )
}

function Signatures({ refs, settings }: { refs: DishRef[]; settings: Settings | null }) {
  const { pick, dir, t } = useI18n()
  const track = useRef<HTMLDivElement>(null)
  const scrollBy = (step: number) => {
    const el = track.current
    if (el) el.scrollBy({ left: step * (dir === 'rtl' ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="home-sec sig">
      <div className="container sig__head">
        <SectionHead eyebrowKey="chefsPicks" titleKey="signatures" subKey="signaturesSub" />
        <div className="sig__arrows">
          <button className="round-btn" onClick={() => scrollBy(-1)} aria-label={t('previous')}>
            <ChevronIcon size={16} className="flip-back" />
          </button>
          <button className="round-btn" onClick={() => scrollBy(1)} aria-label={t('next')}>
            <ChevronIcon size={16} className="flip-fwd" />
          </button>
        </div>
      </div>
      <div className="sig__track" ref={track}>
        {refs.map((ref, i) => (
          <motion.div
            key={ref.product.id}
            className="sig__item"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: Math.min(i, 5) * 0.08, ease: EASE }}
          >
            <Link to={dishPath(ref)} state={{ modal: true }} className="sig__card">
              <DishMedia product={ref.product} icon={ref.section.icon} size="fill" />
              <span className="sig__veil" />
              <span className="sig__body">
                <span className="sig__cat">{pick(ref.section.name)}</span>
                <span className="sig__name">{pick(ref.product.name)}</span>
                <Price value={ref.product.price} sale={ref.product.sale_price} settings={settings} className="sig__price" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
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
      icon: <PinIcon size={18} />,
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
  if (hours) items.push({ key: 'hours', icon: <ClockIcon size={18} />, label: t('openingHours'), node: <span className="pre">{hours}</span> })
  if (s.phone)
    items.push({
      key: 'phone',
      icon: <PhoneIcon size={18} />,
      label: t('getInTouch'),
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

  return (
    <footer className="sfoot">
      <div className="container sfoot__inner">
        <div className="sfoot__logo">{s.logo_url ? <img src={s.logo_url} alt="" className="brand-img" /> : <Logo />}</div>
        {items.length > 0 && (
          <ul className="sfoot__info">
            {items.map((it) => (
              <li key={it.key}>
                <span className="sfoot__ico">{it.icon}</span>
                <span>
                  <span className="sfoot__label">{it.label}</span>
                  {it.node}
                </span>
              </li>
            ))}
          </ul>
        )}
        {socials.length > 0 && (
          <ul className="sfoot__socials">
            {socials.map((x) => (
              <li key={x.label}>
                <a href={x.href} target="_blank" rel="noreferrer" aria-label={x.label} className="round-btn">
                  {x.icon}
                </a>
              </li>
            ))}
          </ul>
        )}
        {note && <p className="sfoot__note">{note}</p>}
        <p className="sfoot__brand">
          © {lang === 'ar' ? s.name_ar : s.name_en} · {t('digitalMenu')}
        </p>
        <PhotoCredits />
      </div>
    </footer>
  )
}
