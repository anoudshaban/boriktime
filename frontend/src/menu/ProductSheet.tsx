import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CategoryIcon, ChevronIcon, CloseIcon, ShareIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category, Product, Settings } from '../types'
import { DishMedia, Price, Tags } from './parts'

type Props = {
  selection: { product: Product; category: Category } | null
  settings: Settings | null
  onClose: () => void
  onNavigate: (product: Product) => void
}

function useIsDesktop() {
  const query = '(min-width: 760px)'
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return desktop
}

export function ProductSheet({ selection, settings, onClose, onNavigate }: Props) {
  const { lang, dir, pick, other, t } = useI18n()
  const desktop = useIsDesktop()
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dragControls = useDragControls()
  const startDrag = (e: PointerEvent) => {
    if (!desktop) dragControls.start(e)
  }

  const product = selection?.product
  const siblings = selection?.category.products ?? []
  const index = product ? siblings.findIndex((p) => p.id === product.id) : -1
  const prev = index > 0 ? siblings[index - 1] : null
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null

  // Lock page scroll and move focus into the dialog while it is open.
  const open = Boolean(selection)
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingInlineEnd = `${scrollbar}px`
    requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingInlineEnd = ''
      previouslyFocused?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === forward && next) onNavigate(next)
      if (e.key === back && prev) onNavigate(prev)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dir, next, prev, onClose, onNavigate])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(id)
  }, [toast])

  const share = async () => {
    if (!product) return
    const url = `${location.origin}${location.pathname}#dish-${product.id}`
    const title = `${pick(product.name)} · ${settings?.name_en ?? 'Börek Time'}`
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        setToast(t('copied'))
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  const panelMotion = desktop
    ? { initial: { opacity: 0, y: 40, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 30, scale: 0.97 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  return (
    <AnimatePresence>
      {selection && product && (
        <div className="sheet" role="presentation">
          <motion.div
            className="sheet__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            ref={panelRef}
            className="sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            tabIndex={-1}
            {...panelMotion}
            transition={reduce ? { duration: 0 } : { type: 'spring', damping: 32, stiffness: 320 }}
            drag={desktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && <span className="sheet__grabber" aria-hidden="true" onPointerDown={startDrag} />}

            <button className="sheet__close" onClick={onClose} aria-label={t('close')}>
              <CloseIcon size={20} />
            </button>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={product.id}
                className="sheet__layout"
                initial={{ opacity: 0, x: dir === 'rtl' ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir === 'rtl' ? 24 : -24 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div className="sheet__media" layoutId={`dish-media-${product.id}`} onPointerDown={startDrag}>
                  <DishMedia product={product} icon={selection.category.icon} size="sheet" />
                </motion.div>

                <div className="sheet__info">
                  <p className="sheet__category">
                    <CategoryIcon name={selection.category.icon} size={16} />
                    {pick(selection.category.name)}
                    {product.code != null && (
                      <span className="sheet__code">
                        {t('number')} {formatInt(product.code, lang)}
                      </span>
                    )}
                  </p>

                  <h2 id="sheet-title" className="sheet__name">
                    {pick(product.name)}
                  </h2>
                  <p className="sheet__alt" lang={lang === 'en' ? 'ar' : 'en'}>
                    {other(product.name)}
                  </p>

                  <div className="sheet__ornament" aria-hidden="true">
                    <span />
                    <CategoryIcon name="borek" size={18} />
                    <span />
                  </div>

                  {pick(product.description) && <p className="sheet__desc">{pick(product.description)}</p>}

                  <Tags tags={product.tags} />

                  <div className="sheet__bottom">
                    <Price value={product.price} settings={settings} className="price price--lg" />
                    {product.calories != null && (
                      <span className="sheet__kcal">
                        {formatInt(product.calories, lang)} {t('kcal')}
                      </span>
                    )}
                    <button className="sheet__share" onClick={share}>
                      <ShareIcon size={18} />
                      <span>{t('share')}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {(prev || next) && (
              <nav className="sheet__nav">
                <button disabled={!prev} onClick={() => prev && onNavigate(prev)}>
                  <ChevronIcon size={18} className="flip" />
                  <span>{prev ? pick(prev.name) : t('previous')}</span>
                </button>
                <span className="sheet__count">
                  {formatInt(index + 1, lang)} / {formatInt(siblings.length, lang)}
                </span>
                <button disabled={!next} onClick={() => next && onNavigate(next)}>
                  <span>{next ? pick(next.name) : t('next')}</span>
                  <ChevronIcon size={18} />
                </button>
              </nav>
            )}

            <AnimatePresence>
              {toast && (
                <motion.div className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
