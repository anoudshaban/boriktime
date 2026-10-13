import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronIcon, CloseIcon, ShareIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, formatPrice } from '../lib/text'
import type { Category, Group, Product, Settings } from '../types'
import { dishPath, useMenuData, type DishRef } from './menuData'
import { useMyList } from './myList'
import { DishMedia, Price, Tags } from './parts'

type Props = {
  group: Group
  section: Category
  product: Product
  settings: Settings | null
  onClose: () => void
}

const EASE = [0.2, 0.7, 0.3, 1] as const

/** Dishes from other groups to suggest alongside this one (a drink with a dish…). */
function pairsFor(product: Product, group: Group, groups: Group[]): DishRef[] {
  const pool = groups
    .filter((g) => g.id !== group.id)
    .flatMap((g) => g.sections.flatMap((s) => s.products.map((p) => ({ product: p, section: s, group: g }))))
  if (!pool.length) return []
  const picks: DishRef[] = []
  for (let i = 0; picks.length < Math.min(3, pool.length); i++) {
    const ref = pool[(product.id * 7 + i * 13) % pool.length]
    if (!picks.includes(ref)) picks.push(ref)
  }
  return picks
}

/** Full-screen "quick view" of one dish, layered over its group page. */
export function DishView({ group, section, product, settings, onClose }: Props) {
  const { lang, dir, pick, other, t } = useI18n()
  const { groups, offersFor } = useMenuData()
  const list = useMyList()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const scroller = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const siblings = section.products
  const index = Math.max(0, siblings.findIndex((p) => p.id === product.id))
  const prev = index > 0 ? siblings[index - 1] : null
  const next = index < siblings.length - 1 ? siblings[index + 1] : null
  const [direction, setDirection] = useState(0)

  const goTo = useCallback(
    (target: Product | null, step: number) => {
      if (!target) return
      setDirection(step)
      navigate(`/menu/${group.slug}/${target.id}`, { replace: true, state: { modal: true } })
    },
    [group.slug, navigate],
  )

  // Lock the page behind; Escape closes; arrow keys step through the section.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return zoom ? setZoom(false) : onClose()
      const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === forward) goTo(next, 1)
      if (e.key === back) goTo(prev, -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dir, next, prev, goTo, onClose, zoom])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [product.id, reduce])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(id)
  }, [toast])

  const onSwipe = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 60) return
    const towardsNext = dir === 'rtl' ? info.offset.x > 0 : info.offset.x < 0
    if (towardsNext) goTo(next, 1)
    else goTo(prev, -1)
  }

  const share = async () => {
    const url = location.href
    try {
      if (navigator.share) await navigator.share({ title: pick(product.name), url })
      else {
        await navigator.clipboard.writeText(url)
        setToast(t('copied'))
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  const addToList = () => {
    list.add(product.id)
    setToast(`${pick(product.name)} — ${t('inList')}`)
  }

  const others = siblings.filter((p) => p.id !== product.id)
  const related = [...others.slice(index), ...others.slice(0, index)].slice(0, 3)
  const pairs = pairsFor(product, group, groups)
  const offers = offersFor(product.id)
  const qty = list.qtyOf(product.id)
  const description = pick(product.description)
  const onSale = product.sale_price != null && product.sale_price < product.price
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en
  const flip = dir === 'rtl' ? -1 : 1

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
      {/* Soft colour glow taken from the photo itself. */}
      <AnimatePresence>
        {product.image && (
          <motion.div
            key={product.image}
            className="dish__ambient"
            style={{ backgroundImage: `url("${product.image}")` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      <header className="dish__chrome">
        <button className="pill-btn pill-btn--glass" onClick={onClose}>
          <ChevronIcon size={15} className="flip-back" />
          {t('back')}
        </button>
        <button className="round-btn round-btn--glass" onClick={onClose} aria-label={t('close')}>
          <CloseIcon size={18} />
        </button>
      </header>

      <div className="dish__scroll" ref={scroller}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.article
            key={product.id}
            className="dish__layout"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 * direction * flip }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 * direction * flip }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="dish__visual">
              <motion.div
                className="dish__media"
                drag={siblings.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={onSwipe}
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              >
                {product.image ? (
                  <button className="dish__zoom" onClick={() => setZoom(true)} aria-label={t('tapToZoom')}>
                    <DishMedia product={product} icon={section.icon} size="fill" />
                  </button>
                ) : (
                  <DishMedia product={product} icon={section.icon} size="fill" />
                )}
                {onSale && <span className="dish__sale">{t('offer')}</span>}
              </motion.div>
              {product.image && product.image_credit && (
                <p className="credit">
                  {t('photo')}: {product.image_credit}
                </p>
              )}

              {siblings.length > 1 && (
                <div className="dish__stepper">
                  <button className="round-btn" onClick={() => goTo(prev, -1)} disabled={!prev} aria-label={t('previous')}>
                    <ChevronIcon size={16} className="flip-back" />
                  </button>
                  <span className="dish__count">
                    {formatInt(index + 1, lang)} / {formatInt(siblings.length, lang)}
                  </span>
                  <button className="round-btn" onClick={() => goTo(next, 1)} disabled={!next} aria-label={t('next')}>
                    <ChevronIcon size={16} className="flip-fwd" />
                  </button>
                </div>
              )}
            </div>

            <div className="dish__info">
              <h1 id="dish-title" className="dish__name">
                {pick(product.name)}
              </h1>
              <p className="dish__alt" lang={lang === 'en' ? 'ar' : 'en'}>
                {other(product.name)}
              </p>
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

              <Price value={product.price} sale={product.sale_price} settings={settings} className="dish__price" />
              {onSale && (
                <p className="dish__save">
                  {t('save')} {formatPrice(product.price - product.sale_price!, lang)} {currency}
                </p>
              )}
              {product.calories != null && (
                <p className="kcal">
                  {formatInt(product.calories, lang)} {t('kcal')}
                </p>
              )}

              <div className="dish__actions">
                <motion.button className="dish__add" onClick={addToList} whileTap={{ scale: 0.96 }}>
                  <span className="dish__add-plus" aria-hidden="true">
                    +
                  </span>
                  {qty ? t('addAnother') : t('addToList')}
                  <AnimatePresence>
                    {qty > 0 && (
                      <motion.span key={qty} className="dish__add-qty" initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        {formatInt(qty, lang)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <button className="round-btn round-btn--lg" onClick={share} aria-label={t('share')}>
                  <ShareIcon size={18} />
                </button>
              </div>

              {offers.length > 0 && (
                <div className="dish__offers">
                  <span className="eyebrow eyebrow--sm">{t('partOfOffer')}</span>
                  {offers.map((offer) => (
                    <Link key={offer.id} to={`/offers/${offer.id}`} className="dish__offer-link">
                      {pick(offer.title)}
                      <ChevronIcon size={14} className="flip-fwd" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.article>
        </AnimatePresence>

        {pairs.length > 0 && <Strip title={t('pairsWith')} refs={pairs} settings={settings} />}
        {related.length > 0 && (
          <Strip title={t('youMayAlsoLike')} refs={related.map((p) => ({ product: p, section, group }))} settings={settings} />
        )}
      </div>

      <AnimatePresence>
        {zoom && product.image && (
          <motion.div className="lightbox" onClick={() => setZoom(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img
              src={product.image}
              alt={pick(product.name)}
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            />
            <button className="round-btn lightbox__close" aria-label={t('close')}>
              <CloseIcon size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Strip({ title, refs, settings }: { title: string; refs: DishRef[]; settings: Settings | null }) {
  const { pick } = useI18n()
  return (
    <section className="also container">
      <h3>{title}</h3>
      <div className="strip">
        {refs.map((ref) => (
          <Link key={ref.product.id} to={dishPath(ref)} replace state={{ modal: true }} className="card card--mini">
            <DishMedia product={ref.product} icon={ref.section.icon} size="g" />
            <span className="card__name">{pick(ref.product.name)}</span>
            <Price value={ref.product.price} sale={ref.product.sale_price} settings={settings} className="card__price" />
          </Link>
        ))}
      </div>
    </section>
  )
}
