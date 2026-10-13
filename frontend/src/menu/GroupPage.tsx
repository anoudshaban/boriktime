import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category, Group, Product, Settings } from '../types'
import { groupImage, SiteFooter } from './Home'
import { DishMedia, Price } from './parts'
import { SectionBanner } from './SectionBanner'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

const TABS_OFFSET = 132
const EASE = [0.2, 0.7, 0.3, 1] as const

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

  // Keep the active tab centred in the strip (works in LTR and RTL).
  useEffect(() => {
    const strip = tabsRef.current
    const tab = strip?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`)
    if (!strip || !tab) return
    const a = tab.getBoundingClientRect()
    const b = strip.getBoundingClientRect()
    strip.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
  }, [activeSlug, lang])

  const dishes = group.sections.reduce((n, s) => n + s.products.length, 0)

  return (
    <main className="gpage">
      <GroupHero group={group} dishes={dishes} />

      {group.sections.length > 1 && (
        <div className="tabs">
          <div className="tabs__strip container" ref={tabsRef} role="tablist" aria-label={t('sections')}>
            {group.sections.map((section, i) => {
              const on = section.slug === activeSlug
              return (
                <button
                  key={section.slug}
                  data-slug={section.slug}
                  role="tab"
                  aria-selected={on}
                  className={`tab${on ? ' is-on' : ''}`}
                  onClick={() => scrollToSection(sectionId(section.slug), TABS_OFFSET - 4)}
                >
                  {on && <motion.span layoutId="tab-on" className="tab__on" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="tab__num">{formatInt(i + 1, lang)}</span>
                  <span className="tab__label">{pick(section.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="container gpage__body">
        {group.sections.map((section, si) => (
          <section key={section.slug} id={sectionId(section.slug)} className="sec" aria-labelledby={`${section.slug}-h`}>
            <SectionBanner section={section} headingId={`${section.slug}-h`} index={si} />
            <div className="dgrid">
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

/** Full-bleed photo header that drifts slower than the page. */
function GroupHero({ group, dishes }: { group: Group; dishes: number }) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '25%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const img = groupImage(group)

  return (
    <header className="ghero" ref={ref}>
      <motion.div className="ghero__bg" style={{ y }} aria-hidden="true">
        {img && (
          <motion.img src={img} alt="" initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1.05, opacity: 1 }} transition={{ duration: 2.2, ease: EASE }} />
        )}
      </motion.div>
      <div className="ghero__veil" />
      {group.image && group.image_credit && <span className="banner__credit">{group.image_credit}</span>}

      <motion.div className="ghero__content container" style={{ opacity: fade }}>
        <motion.nav className="crumbs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link to="/">{t('menu')}</Link>
          <ChevronIcon size={12} className="flip-fwd" />
          <span>{pick(group.name)}</span>
        </motion.nav>
        <motion.h1 className="ghero__title" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease: EASE }}>
          {pick(group.name)}
        </motion.h1>
        {pick(group.description) && (
          <motion.p className="ghero__desc" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: EASE }}>
            {pick(group.description)}
          </motion.p>
        )}
        <motion.p className="ghero__meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          {group.sections.length > 1 && (
            <span>
              {formatInt(group.sections.length, lang)} {t('sectionsWord')}
            </span>
          )}
          <span>
            {formatInt(dishes, lang)} {t('items')}
          </span>
        </motion.p>
      </motion.div>
    </header>
  )
}

function DishCard({ group, section, product, settings, index }: { group: Group; section: Category; product: Product; settings: Settings | null; index: number }) {
  const { pick, other, t } = useI18n()
  const reduce = useReducedMotion()
  const onSale = product.sale_price != null && product.sale_price < product.price
  const description = pick(product.description)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.07, ease: EASE }}
    >
      <Link to={`/menu/${group.slug}/${product.id}`} state={{ modal: true }} className="dcard">
        <span className="dcard__media">
          <DishMedia product={product} icon={section.icon} size="fill" />
          <span className="dcard__shade" />
          {onSale ? (
            <span className="dcard__badge dcard__badge--offer">{t('offer')}</span>
          ) : (
            product.featured && <span className="dcard__badge">★ {t('signature')}</span>
          )}
          <Price value={product.price} sale={product.sale_price} settings={settings} className="dcard__price" />
        </span>
        <span className="dcard__body">
          <span className="dcard__name">{pick(product.name)}</span>
          <span className="dcard__alt">{other(product.name)}</span>
          {description && <span className="dcard__desc">{description}</span>}
        </span>
        <span className="dcard__go" aria-hidden="true">
          <ChevronIcon size={14} className="flip-fwd" />
        </span>
      </Link>
    </motion.div>
  )
}
