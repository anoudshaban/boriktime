import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useMemo, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { ChevronIcon, ClockIcon, FacebookIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsappIcon } from '../components/icons'
import { useI18n, type StringKey } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Group, Settings } from '../types'
import { PhotoCredits } from './Credits'
import { PRELOAD_MS, SplitText } from './fx'
import { dishPath, useMenuData, type DishRef } from './menuData'
import { OffersSlider } from './Offers'
import { DishMedia, Price } from './parts'

const EASE = [0.22, 1, 0.36, 1] as const

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
  const all = useMemo(() => [...dishes.values()], [dishes])

  // Chef's picks first, then any other dish with a photo.
  const showcase = useMemo(() => {
    const withImg = all.filter((d) => d.product.image)
    return [...withImg.filter((d) => d.product.featured), ...withImg.filter((d) => !d.product.featured)]
  }, [all])
  const signatures = useMemo(() => {
    const featured = all.filter((d) => d.product.featured)
    return (featured.length >= 4 ? featured : [...featured, ...showcase.filter((d) => !d.product.featured)]).slice(0, 8)
  }, [all, showcase])

  return (
    <main className="home lux">
      <Welcome groups={groups} settings={settings} firstVisit={firstVisit} />

      <Ticker names={all.map((d) => d.product.name)} />

      {offers.length > 0 && (
        <div id="offers" className="container lux-sec">
          <OffersSlider settings={settings} />
        </div>
      )}

      <section id="menu-groups" className="container lux-sec">
        <SectionHead eyebrowKey="theMenu" titleKey="chooseTable" subKey="chooseTableSub" />
        <div className="rooms">
          {groups.map((g, i) => (
            <Room key={g.slug} group={g} index={i} />
          ))}
        </div>
      </section>

      {signatures.length > 0 && <Signatures refs={signatures} settings={settings} />}

      <SiteFooter settings={settings} />
    </main>
  )
}

/* ---------------------------------------------------------------- */

/** Full-screen welcome: logo, story, and an arched window of slowly changing dishes. */
function Welcome({ groups, settings, firstVisit }: { groups: Group[]; settings: Settings | null; firstVisit: boolean }) {
  const { lang, t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])

  const base = firstVisit && !reduce ? PRELOAD_MS / 1000 + 0.1 : 0.1
  const about = (lang === 'ar' ? settings?.about_ar || settings?.about_en : settings?.about_en || settings?.about_ar) ?? ''
  const motto = (lang === 'ar' ? settings?.motto_ar || settings?.motto_en : settings?.motto_en || settings?.motto_ar) ?? ''
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

  return (
    <section className="welcome" ref={ref}>
      <motion.div className="welcome__text" style={{ y: textY }}>
        <motion.p className="lux-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: base }}>
          {lang === 'ar' ? settings?.tagline_ar : settings?.tagline_en}
        </motion.p>

        <motion.div
          className="welcome__logo"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: base, ease: EASE }}
        >
          {settings?.logo_url ? <img src={settings.logo_url} alt={settings.name_en} className="brand-img" /> : <Logo title={settings?.name_en ?? 'Börek Time'} />}
        </motion.div>

        <motion.span className="hairline" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: base + 0.3, ease: EASE }} />

        {about && (
          <p className="welcome__about">
            <SplitText text={about} delay={base + 0.35} stagger={0.018} />
          </p>
        )}
        {motto && (
          <motion.p className="welcome__motto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: base + 0.9 }}>
            {motto}
          </motion.p>
        )}

        <motion.div className="welcome__ctas" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: base + 1.05, ease: EASE }}>
          <button className="lux-btn" onClick={() => go('menu-groups')}>
            <span>{t('viewMenu')}</span>
            <ChevronIcon size={14} className="flip-fwd" />
          </button>
        </motion.div>
      </motion.div>

      <SectionIndex groups={groups} delay={base + 0.3} />

      <button className="welcome__scroll" onClick={() => go('menu-groups')} aria-label={t('scroll')}>
        <i />
      </button>
    </section>
  )
}

/** Every section of the menu as a quiet, tappable index: thumbnail, both names, count. */
function SectionIndex({ groups, delay }: { groups: Group[]; delay: number }) {
  const { lang, pick, other, t } = useI18n()
  const rows = groups.flatMap((g) => g.sections.map((s) => ({ g, s })))
  const thumb = (s: Group['sections'][number]) => s.image ?? s.products.find((p) => p.image)?.image ?? null

  return (
    <motion.nav className="sindex" aria-label={t('sections')} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay, ease: EASE }}>
      <p className="lux-eyebrow lux-eyebrow--sm sindex__title">{t('theMenu')}</p>
      <ul>
        {rows.map(({ g, s }, i) => {
          const img = thumb(s)
          return (
            <motion.li key={s.slug} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: delay + 0.15 + i * 0.05, ease: EASE }}>
              <Link to={`/menu/${g.slug}`} state={{ section: s.slug }} className="sindex__row">
                <span className="sindex__thumb">{img ? <img src={img} alt="" loading="lazy" /> : null}</span>
                <span className="sindex__names">
                  <span className="sindex__name">{pick(s.name)}</span>
                  <span className="sindex__alt" lang={lang === 'en' ? 'ar' : 'en'}>
                    {other(s.name)}
                  </span>
                </span>
                <span className="sindex__count">{formatInt(s.products.length, lang)}</span>
                <ChevronIcon size={14} className="flip-fwd sindex__chev" />
              </Link>
            </motion.li>
          )
        })}
      </ul>
    </motion.nav>
  )
}

/** One straight, quiet line of dish names drifting by, between gold hairlines. */
function Ticker({ names }: { names: { en: string; ar: string }[] }) {
  const { lang } = useI18n()
  const words = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const n of names) {
      const w = n[lang].replace(/\s*[(/].*$/, '').trim()
      if (w && w.length < 26 && !seen.has(w)) {
        seen.add(w)
        out.push(w)
      }
    }
    return out.slice(0, 22)
  }, [names, lang])
  if (!words.length) return null
  const row = (
    <div className="ticker__row">
      {words.map((w, i) => (
        <span key={i}>
          {w}
          <i aria-hidden="true">✦</i>
        </span>
      ))}
    </div>
  )
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
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
      className="lux-head"
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <span className="lux-eyebrow">{t(eyebrowKey)}</span>
      <h2 className="lux-head__title">
        <SplitText text={t(titleKey)} inView stagger={0.07} />
      </h2>
      <span className="hairline hairline--short" />
      {subKey && <p className="lux-head__sub">{t(subKey)}</p>}
    </motion.header>
  )
}

/** Editorial row: arched photo, roman-style number, large serif name. */
function Room({ group, index }: { group: Group; index: number }) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const img = groupImage(group)
  const dishes = group.sections.reduce((n, s) => n + s.products.length, 0)
  const sections = group.sections.map((s) => pick(s.name)).slice(0, 5)

  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className={`room${index % 2 ? ' room--flip' : ''}`}
    >
      <Link to={`/menu/${group.slug}`} className="room__link">
        <motion.span
          className="room__photo"
          variants={{ hidden: { clipPath: 'inset(0% 0% 100% 0% round 999px 999px 0 0)' }, show: { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 0 0)' } }}
          transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}
        >
          {img ? (
            <motion.img src={img} alt="" loading="lazy" variants={{ hidden: { scale: 1.3 }, show: { scale: 1 } }} transition={{ duration: 1.8, ease: EASE }} />
          ) : (
            <span className="room__empty" />
          )}
        </motion.span>

        <motion.span className="room__text" variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 1, delay: 0.3, ease: EASE }}>
          <span className="room__num">{formatInt(index + 1, lang).padStart(2, lang === 'ar' ? '٠' : '0')}</span>
          <span className="room__name">{pick(group.name)}</span>
          {pick(group.description) && <span className="room__desc">{pick(group.description)}</span>}
          {group.sections.length > 1 && <span className="room__list">{sections.join(' · ')}</span>}
          <span className="room__more">
            {formatInt(dishes, lang)} {t('items')}
            <span className="room__arrow">
              <ChevronIcon size={14} className="flip-fwd" />
            </span>
          </span>
        </motion.span>
      </Link>
    </motion.div>
  )
}

function Signatures({ refs, settings }: { refs: DishRef[]; settings: Settings | null }) {
  const { pick, dir, t } = useI18n()
  const reduce = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const scrollBy = (step: number) => {
    const el = track.current
    if (el) el.scrollBy({ left: step * (dir === 'rtl' ? -1 : 1) * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  return (
    <section className="lux-sec sigs">
      <div className="container">
        <SectionHead eyebrowKey="chefsPicks" titleKey="signatures" subKey="signaturesSub" />
      </div>
      <div className="sigs__track" ref={track}>
        {refs.map((ref, i) => (
          <motion.div
            key={ref.product.id}
            className="sigs__item"
            initial={reduce ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: Math.min(i, 4) * 0.1, ease: EASE }}
          >
            <Link to={dishPath(ref)} state={{ modal: true }} className="sigs__card">
              <span className="sigs__photo">
                <DishMedia product={ref.product} icon={ref.section.icon} size="fill" />
              </span>
              <span className="lux-eyebrow lux-eyebrow--sm">{pick(ref.section.name)}</span>
              <span className="sigs__name">{pick(ref.product.name)}</span>
              <Price value={ref.product.price} sale={ref.product.sale_price} settings={settings} className="sigs__price" />
            </Link>
          </motion.div>
        ))}
      </div>
      <div className="sigs__nav">
        <button className="round-btn" onClick={() => scrollBy(-1)} aria-label={t('previous')}>
          <ChevronIcon size={16} className="flip-back" />
        </button>
        <button className="round-btn" onClick={() => scrollBy(1)} aria-label={t('next')}>
          <ChevronIcon size={16} className="flip-fwd" />
        </button>
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
