import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { CloseIcon, ListIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, formatPrice } from '../lib/text'
import { useMenuData } from './menuData'
import { useMyList } from './myList'
import { DishMedia } from './parts'

/** Floating "My list" button plus the sheet guests show to their waiter. */
export function MyListButton() {
  const list = useMyList()
  const { lang, t } = useI18n()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
        {list.count > 0 && (
          <motion.button
            className="mylist-fab"
            onClick={() => setOpen(true)}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            aria-label={t('myList')}
          >
            <motion.span
              key={list.pulse}
              className="mylist-fab__icon"
              initial={reduce ? false : { scale: 1.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <ListIcon size={18} />
            </motion.span>
            {t('myList')}
            <span className="mylist-fab__count">{formatInt(list.count, lang)}</span>
          </motion.button>
        )}
      </AnimatePresence>
      <MyListSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function MyListSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const list = useMyList()
  const { dishes, settings } = useMenuData()
  const { lang, pick, t } = useI18n()

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Dishes removed from the menu since they were added are skipped.
  const rows = list.entries.map((e) => ({ ...e, ref: dishes.get(e.id) })).filter((r) => r.ref)
  const total = rows.reduce((sum, r) => {
    const p = r.ref!.product
    return sum + (p.sale_price ?? p.price) * r.qty
  }, 0)
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en

  return (
    <AnimatePresence>
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={t('myList')}>
          <motion.div className="sheet__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet__panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}
          >
            <span className="sheet__grab" />
            <header className="sheet__head">
              <h2>{t('myList')}</h2>
              <button className="round-btn" onClick={onClose} aria-label={t('close')}>
                <CloseIcon size={16} />
              </button>
            </header>

            {rows.length === 0 ? (
              <p className="note sheet__empty">{t('myListEmpty')}</p>
            ) : (
              <>
                <p className="eyebrow sheet__hint">{t('showWaiter')}</p>
                <ul className="mylist">
                  <AnimatePresence initial={false}>
                    {rows.map(({ id, qty, ref }) => (
                      <motion.li key={id} layout exit={{ opacity: 0, x: -30 }}>
                        <DishMedia product={ref!.product} icon={ref!.section.icon} size="g" spin={false} />
                        <span className="mylist__name">
                          {pick(ref!.product.name)}
                          <span className="mylist__alt">{lang === 'ar' ? ref!.product.name.en : ref!.product.name.ar}</span>
                        </span>
                        <span className="mylist__qty">
                          <button onClick={() => list.remove(id)} aria-label="−">
                            −
                          </button>
                          <span>{formatInt(qty, lang)}</span>
                          <button onClick={() => list.add(id)} aria-label="+">
                            +
                          </button>
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="mylist__total">
                  <span>{t('total')}</span>
                  <span className="mylist__sum">
                    {formatPrice(Math.round(total * 1000) / 1000, lang)} {currency}
                  </span>
                </div>
                <button className="pill-btn mylist__clear" onClick={list.clear}>
                  {t('clearList')}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
