import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { CloseIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { useMenuData } from './menuData'

/**
 * "Photo credits" link + sheet listing every openly licensed photo on the
 * menu. Only shown while such photos are in use.
 */
export function PhotoCredits() {
  const { groups } = useMenuData()
  const { pick, t } = useI18n()
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    const out: { key: string; name: string; credit: string }[] = []
    for (const g of groups) {
      if (g.image && g.image_credit) out.push({ key: `g${g.id}`, name: pick(g.name), credit: g.image_credit })
      for (const s of g.sections) {
        if (s.image && s.image_credit && s.id !== g.id) out.push({ key: `s${s.id}`, name: pick(s.name), credit: s.image_credit })
        for (const p of s.products) if (p.image && p.image_credit) out.push({ key: `p${p.id}`, name: pick(p.name), credit: p.image_credit })
      }
    }
    return out
  }, [groups, pick])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!rows.length) return null

  return (
    <>
      <button className="credits-link" onClick={() => setOpen(true)}>
        {t('photoCredits')}
      </button>
      <AnimatePresence>
        {open && (
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('photoCredits')}>
            <motion.div className="sheet__backdrop" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div
              className="sheet__panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <span className="sheet__grab" />
              <header className="sheet__head">
                <h2>{t('photoCredits')}</h2>
                <button className="round-btn" onClick={() => setOpen(false)} aria-label={t('close')}>
                  <CloseIcon size={16} />
                </button>
              </header>
              <p className="note">{t('photoCreditsNote')}</p>
              <ul className="credits">
                {rows.map((r) => (
                  <li key={r.key}>
                    <span className="credits__name">{r.name}</span>
                    <span className="credits__by" dir="ltr">
                      {r.credit}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
