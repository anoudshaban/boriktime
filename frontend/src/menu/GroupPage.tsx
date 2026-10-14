import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import type { Group, Settings } from '../types'
import { rise, SiteFooter } from './Home'
import { DishPlate, Price } from './parts'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

const CHIPS_OFFSET = 128
const EASE = [0.22, 1, 0.36, 1] as const

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

  // Arriving from the home index with a chosen section: jump to it.
  const location = useLocation()
  const target = (location.state as { section?: string } | null)?.section
  useEffect(() => {
    if (!target) return
    const id = window.setTimeout(() => scrollToSection(sectionId(target), CHIPS_OFFSET - 4), 400)
    return () => window.clearTimeout(id)
  }, [target])

  // Keep the active chip centred in the strip (works in LTR and RTL).
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
    <main className="st st-group-page">
      <header className="st-head">
        <motion.h1 className="st-head__title" {...rise(0.05, reduce)}>
          {pick(group.name)}
        </motion.h1>
        <motion.p className="st-eyebrow" {...rise(0.12, reduce)}>
          {brand}
        </motion.p>
        {pick(group.description) && (
          <motion.p className="st-note" {...rise(0.18, reduce)}>
            {pick(group.description)}
          </motion.p>
        )}
      </header>

      {group.sections.length > 1 && (
        <div className="st-chips">
          <div className="st-chips__strip" ref={chipsRef} role="tablist" aria-label={t('sections')}>
            {group.sections.map((section) => {
              const on = section.slug === activeSlug
              return (
                <button
                  key={section.slug}
                  data-slug={section.slug}
                  role="tab"
                  aria-selected={on}
                  className={`st-chip${on ? ' is-on' : ''}`}
                  onClick={() => scrollToSection(sectionId(section.slug), CHIPS_OFFSET - 4)}
                >
                  {on && <motion.span layoutId="st-chip" className="st-chip__on" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="st-chip__label">{pick(section.name)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="st-body">
        {group.sections.map((section) => (
          <section key={section.slug} id={sectionId(section.slug)} className="st-sec" aria-labelledby={`${section.slug}-h`}>
            <h2 id={`${section.slug}-h`} className="st-sec__title">
              {pick(section.name)}
            </h2>
            <motion.span className="st-sec__line" initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} />
            {pick(section.description) && <p className="st-sec__note">{pick(section.description)}</p>}

            <div className="st-grid">
              {section.products.map((product, i) => {
                const onSale = product.sale_price != null && product.sale_price < product.price
                return (
                  <motion.div
                    key={product.id}
                    initial={reduce ? false : { opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -30px 0px' }}
                    transition={{ duration: 0.7, delay: (i % 4) * 0.07, ease: EASE }}
                  >
                    <Link to={`/menu/${group.slug}/${product.id}`} state={{ modal: true }} className="st-card">
                      {onSale ? <span className="st-card__tag st-card__tag--offer">{t('offer')}</span> : product.featured && <span className="st-card__tag">{t('signature')}</span>}
                      <DishPlate product={product} icon={section.icon} />
                      <span className="st-card__name">{pick(product.name)}</span>
                      <span className="st-card__alt" lang={lang === 'en' ? 'ar' : 'en'}>
                        {lang === 'en' ? product.name.ar : product.name.en}
                      </span>
                      <Price value={product.price} sale={product.sale_price} settings={settings} className="st-card__price" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <SiteFooter settings={settings} />
    </main>
  )
}
