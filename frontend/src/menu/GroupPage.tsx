import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category, Group, Product, Settings } from '../types'
import { SplitText } from './fx'
import { groupImage, SiteFooter } from './Home'
import { DishMedia, Price } from './parts'
import { SectionBanner } from './SectionBanner'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

const TABS_OFFSET = 132
const EASE = [0.22, 1, 0.36, 1] as const

type Props = { group: Group; settings: Settings | null }

export function GroupPage({ group, settings }: Props) {
  const { lang, pick, t } = useI18n()
  const tabsRef = useRef<HTMLDivElement>(null)
  const sectionId = (slug: string) => `sec-${slug}`
  const active = useScrollSpy(
    group.sections.map((s) => sectionId(s.slug)),
    TABS_OFFSET,
  )
  const activeSlug = active?.replace(/^sec-/, '') ?? group.sections[0]?.slug

  // Arriving from the home index: jump to the chosen section.
  const location = useLocation()
  const target = (location.state as { section?: string } | null)?.section
  useEffect(() => {
    if (!target) return
    const id = window.setTimeout(() => scrollToSection(sectionId(target), TABS_OFFSET - 4), 450)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  // Keep the active tab centred in the strip (works in LTR and RTL).
  useEffect(() => {
    const strip = tabsRef.current
    const tab = strip?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`)
    if (!strip || !tab) return
    const a = tab.getBoundingClientRect()
    const b = strip.getBoundingClientRect()
    strip.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
  }, [activeSlug, lang])

  return (
    <main className="gpage lux">
      <GroupHeader group={group} />

      {group.sections.length > 1 && (
        <div className="ltabs">
          <div className="ltabs__strip container" ref={tabsRef} role="tablist" aria-label={t('sections')}>
            {group.sections.map((section) => {
              const on = section.slug === activeSlug
              return (
                <button
                  key={section.slug}
                  data-slug={section.slug}
                  role="tab"
                  aria-selected={on}
                  className={`ltab${on ? ' is-on' : ''}`}
                  onClick={() => scrollToSection(sectionId(section.slug), TABS_OFFSET - 4)}
                >
                  {pick(section.name)}
                  {on && <motion.span layoutId="ltab-line" className="ltab__line" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="container">
        {group.sections.map((section, si) => (
          <section key={section.slug} id={sectionId(section.slug)} className="lsec" aria-labelledby={`${section.slug}-h`}>
            <SectionBanner section={section} headingId={`${section.slug}-h`} index={si} />
            <div className="lgrid">
              {section.products.map((product, i) => (
                <DishCard key={product.id} group={group} section={section} product={product} settings={settings} index={i} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <SiteFooter settings={settings} />
    </main>
  )
}

/** Centered editorial title over a wide framed photo that drifts with the scroll. */
function GroupHeader({ group }: { group: Group }) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const dishes = group.sections.reduce((n, s) => n + s.products.length, 0)

  // Up to three photos for the fanned collage: section photos first, then dishes.
  const photos: string[] = []
  const add = (src?: string | null) => src && !photos.includes(src) && photos.length < 3 && photos.push(src)
  add(groupImage(group))
  group.sections.forEach((s) => add(s.image))
  group.sections.forEach((s) => s.products.forEach((p) => add(p.image)))

  return (
    <header className="gheader container">
      <div className="gheader__text">
        <motion.nav className="crumbs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link to="/">{t('menu')}</Link>
          <ChevronIcon size={11} className="flip-fwd" />
          <span>{pick(group.name)}</span>
        </motion.nav>
        <h1 className="gheader__title">
          <SplitText text={pick(group.name)} delay={0.2} stagger={0.09} />
        </h1>
        <motion.span className="hairline hairline--short gheader__rule" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.4, ease: EASE }} />
        {pick(group.description) && (
          <motion.p className="gheader__desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }}>
            {pick(group.description)}
          </motion.p>
        )}
        <motion.p className="lux-eyebrow lux-eyebrow--sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          {group.sections.length > 1 && `${formatInt(group.sections.length, lang)} ${t('sectionsWord')} · `}
          {formatInt(dishes, lang)} {t('items')}
        </motion.p>
      </div>

      {photos.length > 0 && (
        <div className="collage" aria-hidden="true">
          {photos.map((src, i) => (
            <motion.span
              key={src}
              className={`collage__card collage__card--${i}`}
              initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: [-6, 4, -1][i] }}
              transition={{ duration: 1.1, delay: 0.3 + i * 0.15, ease: EASE }}
            >
              <img src={src} alt="" />
            </motion.span>
          ))}
        </div>
      )}
    </header>
  )
}

function DishCard({ group, section, product, settings, index }: { group: Group; section: Category; product: Product; settings: Settings | null; index: number }) {
  const { pick, other, t } = useI18n()
  const reduce = useReducedMotion()
  const onSale = product.sale_price != null && product.sale_price < product.price

  return (
    <motion.div
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.9, delay: (index % 4) * 0.08, ease: EASE }}
    >
      <Link to={`/menu/${group.slug}/${product.id}`} state={{ modal: true }} className="lcard">
        <span className="lcard__photo">
          <motion.span
            className="lcard__reveal"
            variants={{ hidden: { clipPath: 'inset(100% 0% 0% 0%)' }, show: { clipPath: 'inset(0% 0% 0% 0%)' } }}
            transition={{ duration: 1.1, delay: (index % 4) * 0.08, ease: [0.76, 0, 0.24, 1] }}
          >
            <DishMedia product={product} icon={section.icon} size="fill" live section={section.slug} />
          </motion.span>
          {onSale ? <span className="lcard__tag lcard__tag--offer">{t('offer')}</span> : product.featured && <span className="lcard__tag">✦ {t('signature')}</span>}
        </span>
        <span className="lcard__name">{pick(product.name)}</span>
        <span className="lcard__alt">{other(product.name)}</span>
        <span className="lcard__rule" />
        <Price value={product.price} sale={product.sale_price} settings={settings} className="lcard__price" />
      </Link>
    </motion.div>
  )
}
