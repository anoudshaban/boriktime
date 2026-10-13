import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Logo } from '../components/brand/Logo'
import { CategoryIcon, GridIcon, ListIcon, SearchIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import type { Category } from '../types'

export type ViewMode = 'grid' | 'list'

type Props = {
  categories: Category[]
  active: string | null
  solid: boolean
  view: ViewMode
  onView: (view: ViewMode) => void
  onJump: (slug: string) => void
  onSearch: () => void
  onTop: () => void
}

export function TopBar({ categories, active, solid, view, onView, onJump, onSearch, onTop }: Props) {
  const { lang, pick, t, toggle } = useI18n()
  const navRef = useRef<HTMLDivElement>(null)

  // Keep the active chip in view as the guest scrolls through sections.
  useEffect(() => {
    const nav = navRef.current
    const chip = nav?.querySelector<HTMLElement>(`[data-slug="${active}"]`)
    if (!nav || !chip) return
    // Centre the chip by its on-screen offset, which works the same in LTR and RTL.
    // (Not scrollIntoView: it would cancel the page's own smooth scroll in Chrome.)
    const chipBox = chip.getBoundingClientRect()
    const navBox = nav.getBoundingClientRect()
    const delta = chipBox.left + chipBox.width / 2 - (navBox.left + navBox.width / 2)
    nav.scrollBy({ left: delta, behavior: 'smooth' })
  }, [active, lang])

  return (
    <div className={`topbar${solid ? ' is-solid' : ''}`}>
      <div className="topbar__row container">
        <button className="topbar__brand" onClick={onTop} aria-label="Börek Time">
          <Logo markOnly className="topbar__mark" />
          <span className="topbar__name">{lang === 'ar' ? 'بوريك تايم' : 'Börek Time'}</span>
        </button>

        <div className="topbar__actions">
          <div className="segmented" role="radiogroup" aria-label="View">
            {(['grid', 'list'] as const).map((mode) => (
              <button
                key={mode}
                role="radio"
                aria-checked={view === mode}
                className={view === mode ? 'is-on' : ''}
                onClick={() => onView(mode)}
                title={t(mode)}
              >
                {view === mode && <motion.span layoutId="seg-pill" className="segmented__pill" transition={{ type: 'spring', damping: 26, stiffness: 380 }} />}
                {mode === 'grid' ? <GridIcon size={18} /> : <ListIcon size={18} />}
                <span className="sr-only">{t(mode)}</span>
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={onSearch} aria-label={t('search')}>
            <SearchIcon size={20} />
          </button>
          <button className="lang-btn" onClick={toggle} lang={lang === 'en' ? 'ar' : 'en'}>
            {t('language')}
          </button>
        </div>
      </div>

      <nav className="catnav" aria-label={t('menu')}>
        <div className="catnav__scroller" ref={navRef}>
          {categories.map((c) => {
            const on = active === c.slug
            return (
              <button
                key={c.slug}
                data-slug={c.slug}
                className={`chip${on ? ' is-active' : ''}`}
                onClick={() => onJump(c.slug)}
                aria-current={on ? 'true' : undefined}
              >
                {on && <motion.span layoutId="chip-pill" className="chip__pill" transition={{ type: 'spring', damping: 30, stiffness: 380 }} />}
                <CategoryIcon name={c.icon} size={17} />
                <span>{pick(c.name)}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
