import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import type { Group, Settings } from '../types'
import { DishMedia, Price } from './parts'
import { SectionBanner } from './SectionBanner'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

const CHIPS_OFFSET = 66
const EASE = [0.2, 0.7, 0.3, 1] as const

type Props = { group: Group; settings: Settings | null }

export function GroupPage({ group, settings }: Props) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const chipsRef = useRef<HTMLDivElement>(null)
  const sectionId = (slug: string) => `sec-${slug}`
  const active = useScrollSpy(
    group.sections.map((s) => sectionId(s.slug)),
    CHIPS_OFFSET,
  )
  const activeSlug = active?.replace(/^sec-/, '') ?? group.sections[0]?.slug

  // Keep the active tab centred in the strip (works in LTR and RTL).
  useEffect(() => {
    const strip = chipsRef.current
    const chip = strip?.querySelector<HTMLElement>(`[data-slug="${activeSlug}"]`)
    if (!strip || !chip) return
    const a = chip.getBoundingClientRect()
    const b = strip.getBoundingClientRect()
    strip.scrollBy({ left: a.left + a.width / 2 - (b.left + b.width / 2), behavior: 'smooth' })
  }, [activeSlug, lang])

  const brand = lang === 'ar' ? settings?.name_ar : settings?.name_en

  return (
    <main className="view">
      <div className="container">
        <h1 className="title">{pick(group.name)}</h1>
        <p className="eyebrow">{brand}</p>
        {pick(group.description) && <p className="note">{pick(group.description)}</p>}
      </div>

      {group.image && <GroupCover src={group.image} credit={group.image_credit} />}

      {group.sections.length > 1 && (
        <div className="chips-bar">
          <div className="chips container" ref={chipsRef} role="tablist" aria-label={t('sections')}>
            {group.sections.map((section) => {
              const on = section.slug === activeSlug
              return (
                <button
                  key={section.slug}
                  data-slug={section.slug}
                  role="tab"
                  aria-selected={on}
                  className={`chip${on ? ' is-on' : ''}`}
                  onClick={() => scrollToSection(sectionId(section.slug), CHIPS_OFFSET - 2)}
                >
                  {on && <motion.span layoutId="chip-on" className="chip__on" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="chip__label">{pick(section.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="container">
        {group.sections.map((section) => (
          <section key={section.slug} id={sectionId(section.slug)} className="sec" aria-labelledby={`${section.slug}-h`}>
            <SectionBanner section={section} headingId={`${section.slug}-h`} />

            <div className="grid">
              {section.products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -30px 0px' }}
                  transition={{ duration: 0.55, delay: (i % 4) * 0.06, ease: EASE }}
                >
                  <Link to={`/menu/${group.slug}/${product.id}`} state={{ modal: true }} className="card">
                    {product.sale_price != null && product.sale_price < product.price ? (
                      <span className="card__badge card__badge--offer">{t('offer')}</span>
                    ) : (
                      product.featured && <span className="card__badge">★ {t('signature')}</span>
                    )}
                    <DishMedia product={product} icon={section.icon} />
                    <span className="card__name">{pick(product.name)}</span>
                    <Price value={product.price} sale={product.sale_price} settings={settings} className="card__price" />
                    <span className="card__btn">{t('viewDish')}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

/** Wide group photo under the title, drifting slower than the page. */
function GroupCover({ src, credit }: { src: string; credit?: string | null }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-10%', '10%'])

  return (
    <div className="container">
      <motion.div
        ref={ref}
        className="cover"
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <motion.img src={src} alt="" style={{ y }} />
        {credit && <span className="banner__credit">{credit}</span>}
      </motion.div>
    </div>
  )
}
