import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronIcon, CloseIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category, Group, Product, Settings } from '../types'
import { DishMedia, Price, Tags } from './parts'

type Props = {
  group: Group
  section: Category
  product: Product
  settings: Settings | null
  onClose: () => void
}

const EASE = [0.2, 0.7, 0.3, 1] as const

/** Full-screen "quick view" of one dish, layered over its group page. */
export function DishView({ group, section, product, settings, onClose }: Props) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)

  // Lock the page behind and close on Escape.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Jumping between dishes ("You may also like") starts at the top again.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [product.id])

  const others = section.products.filter((p) => p.id !== product.id)
  const start = Math.max(0, section.products.findIndex((p) => p.id === product.id))
  const related = [...others.slice(start), ...others.slice(0, start)].slice(0, 3)
  const description = pick(product.description)

  return (
    <motion.div
      className="dish"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-title"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <header className="dish__bar">
        <button className="pill-btn" onClick={onClose}>
          <ChevronIcon size={15} className="flip-back" />
          {t('back')}
        </button>
        <div className="dish__bar-title">
          <span className="eyebrow eyebrow--sm">{t('quickView')}</span>
          <span className="dish__bar-name">{pick(product.name)}</span>
        </div>
        <button className="round-btn round-btn--dark" onClick={onClose} aria-label={t('close')}>
          <CloseIcon size={18} />
        </button>
      </header>

      <div className="dish__scroll" ref={scroller}>
        <motion.article
          key={product.id}
          className="dish__layout container"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="dish__visual">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
            >
              <DishMedia product={product} icon={section.icon} size="xl" />
            </motion.div>
          </div>

          <div className="dish__info">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            >
              <h1 id="dish-title" className="dish__name">
                {pick(product.name)}
              </h1>
              <p className="eyebrow dish__eyebrow">
                {pick(section.name)}
                {product.code != null && (
                  <>
                    {' · '}
                    {t('number')} {formatInt(product.code, lang)}
                  </>
                )}
              </p>
              <Tags tags={product.tags} />
              {description && <p className="dish__desc">{description}</p>}
              <Price value={product.price} settings={settings} className="dish__price" />
              {product.calories != null && (
                <p className="kcal">
                  {formatInt(product.calories, lang)} {t('kcal')}
                </p>
              )}
            </motion.div>
          </div>
        </motion.article>

        {related.length > 0 && (
          <section className="also container">
            <h3>{t('youMayAlsoLike')}</h3>
            <div className="strip">
              {related.map((p) => (
                <Link key={p.id} to={`/menu/${group.slug}/${p.id}`} replace state={{ modal: true }} className="card card--mini">
                  <DishMedia product={p} icon={section.icon} size="g" />
                  <span className="card__name">{pick(p.name)}</span>
                  <Price value={p.price} settings={settings} className="card__price" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  )
}
