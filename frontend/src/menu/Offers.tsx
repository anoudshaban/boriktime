import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronIcon, CloseIcon } from '../components/icons'
import { Logo } from '../components/brand/Logo'
import { useI18n } from '../lib/i18n'
import { formatPrice } from '../lib/text'
import type { Offer, Settings } from '../types'
import { dishPath, useMenuData } from './menuData'
import { DishMedia, Price } from './parts'

const EASE = [0.2, 0.7, 0.3, 1] as const
const AUTOPLAY_MS = 5500

function useEndsLabel() {
  const { lang, t } = useI18n()
  return (offer: Offer) => {
    if (!offer.ends_at) return null
    const end = new Date(`${offer.ends_at}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (end.getTime() === today.getTime()) return t('lastDay')
    const date = end.toLocaleDateString(lang === 'ar' ? 'ar-JO' : 'en-GB', { day: 'numeric', month: 'long' })
    return `${t('until')} ${date}`
  }
}

/** The offer's artwork: its photo with a slow zoom, or a branded wine panel. */
function OfferArt({ offer, active }: { offer: Offer; active: boolean }) {
  const reduce = useReducedMotion()
  if (offer.image) {
    return (
      <motion.img
        className="offer__img"
        src={offer.image}
        alt=""
        initial={{ scale: 1.12 }}
        animate={{ scale: active && !reduce ? 1 : 1.12 }}
        transition={{ duration: AUTOPLAY_MS / 1000 + 1, ease: 'linear' }}
      />
    )
  }
  return (
    <div className="offer__art" aria-hidden="true">
      <Logo markOnly className="offer__art-mark" />
    </div>
  )
}

/**
 * Home-page slider of today's offers: auto-plays, swipes, and pauses while
 * the guest is touching it.
 */
export function OffersSlider({ settings }: { settings: Settings | null }) {
  const { offers } = useMenuData()
  const { pick, t, dir } = useI18n()
  const reduce = useReducedMotion()
  const endsLabel = useEndsLabel()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = offers.length

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count])

  useEffect(() => {
    if (count < 2 || paused || reduce) return
    const id = window.setTimeout(() => go(1), AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [index, count, paused, reduce, go])

  if (!count) return null
  const offer = offers[Math.min(index, count - 1)]
  const badge = pick(offer.badge)
  const ends = endsLabel(offer)
  const flip = dir === 'rtl' ? -1 : 1

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50) return
    go(info.offset.x < 0 ? flip : -flip)
  }

  return (
    <section className="offers" aria-roledescription="carousel" aria-label={t('todaysOffers')}>
      <div className="rule rule--tight">
        <span>{t('todaysOffers')}</span>
      </div>

      <div className="offers__stage" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={offer.id}
            className="offer"
            initial={{ opacity: 0, x: 40 * flip }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 * flip }}
            transition={{ duration: 0.55, ease: EASE }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
          >
            <Link to={`/offers/${offer.id}`} state={{ modal: true }} className="offer__link" draggable={false}>
              <OfferArt offer={offer} active />
              <span className="offer__shade" />
              {badge && <span className="offer__badge">{badge}</span>}
              <span className="offer__body">
                <span className="offer__title">{pick(offer.title)}</span>
                {pick(offer.description) && <span className="offer__desc">{pick(offer.description)}</span>}
                <span className="offer__meta">
                  {offer.price != null && (
                    <Price value={offer.old_price ?? offer.price} sale={offer.price} settings={settings} className="offer__price" />
                  )}
                  {ends && <span className="offer__ends">{ends}</span>}
                </span>
              </span>
            </Link>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button className="offers__arrow offers__arrow--prev" onClick={() => go(-1)} aria-label={t('previous')}>
              <ChevronIcon size={16} className="flip-back" />
            </button>
            <button className="offers__arrow offers__arrow--next" onClick={() => go(1)} aria-label={t('next')}>
              <ChevronIcon size={16} className="flip-fwd" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="offers__dots" role="tablist">
          {offers.map((o, i) => (
            <button key={o.id} role="tab" aria-selected={i === index} aria-label={pick(o.title)} onClick={() => setIndex(i)} className={i === index ? 'is-on' : ''}>
              {i === index && !paused && !reduce && (
                <motion.span key={`${o.id}-${index}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/** Full-screen view of one offer with the dishes it includes. */
export function OfferView({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const { dishes, settings } = useMenuData()
  const { pick, t } = useI18n()
  const reduce = useReducedMotion()
  const endsLabel = useEndsLabel()
  const included = offer.product_ids.map((id) => dishes.get(id)).filter((d) => d !== undefined)
  const saving = offer.price != null && offer.old_price != null && offer.old_price > offer.price ? offer.old_price - offer.price : null
  const { lang } = useI18n()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <motion.div
      className="dish"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-title"
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
          <span className="eyebrow eyebrow--sm">{t('offer')}</span>
          <span className="dish__bar-name">{pick(offer.title)}</span>
        </div>
        <button className="round-btn round-btn--dark" onClick={onClose} aria-label={t('close')}>
          <CloseIcon size={18} />
        </button>
      </header>

      <div className="dish__scroll">
        <div className="container offer-page">
          <motion.div
            className="offer offer--hero"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <OfferArt offer={offer} active />
            <span className="offer__shade" />
            {pick(offer.badge) && <span className="offer__badge">{pick(offer.badge)}</span>}
          </motion.div>

          <div className="dish__info offer-page__info">
            <h1 id="offer-title" className="dish__name">
              {pick(offer.title)}
            </h1>
            {endsLabel(offer) && <p className="eyebrow dish__eyebrow">{endsLabel(offer)}</p>}
            {pick(offer.description) && <p className="dish__desc">{pick(offer.description)}</p>}
            {offer.price != null && (
              <Price value={offer.old_price ?? offer.price} sale={offer.price} settings={settings} className="dish__price" />
            )}
            {saving != null && (
              <p className="kcal">
                {t('save')} {formatPrice(saving, lang)} {lang === 'ar' ? settings?.currency_ar : settings?.currency_en}
              </p>
            )}
          </div>

          {included.length > 0 && (
            <section className="also">
              <h3>{t('includes')}</h3>
              <div className="strip strip--wrap">
                {included.map((ref) => (
                  <Link key={ref.product.id} to={dishPath(ref)} className="card card--mini">
                    <DishMedia product={ref.product} icon={ref.section.icon} size="g" />
                    <span className="card__name">{pick(ref.product.name)}</span>
                    <Price value={ref.product.price} sale={ref.product.sale_price} settings={settings} className="card__price" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  )
}
