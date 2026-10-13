import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import type { Category, Product } from '../types'
import { FeaturedStrip } from './FeaturedStrip'
import { Footer } from './Footer'
import { Hero } from './Hero'
import { Intro } from './Intro'
import { MenuSection } from './MenuSection'
import { ProductSheet } from './ProductSheet'
import { SearchOverlay } from './SearchOverlay'
import { TopBar, type ViewMode } from './TopBar'
import { useMenu } from './useMenu'
import { scrollToSection, useScrollSpy } from './useScrollSpy'
import './menu.css'

const VIEW_KEY = 'bt_view'
const introPlaying = (() => {
  try {
    return sessionStorage.getItem('bt_intro_seen') !== '1'
  } catch {
    return true
  }
})()

function readView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function dishIdFromHash(): number | null {
  const m = location.hash.match(/^#dish-(\d+)$/)
  return m ? Number(m[1]) : null
}

function useHeaderOffset(ready: boolean) {
  const [offset, setOffset] = useState(130)
  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector<HTMLElement>('.topbar')
      if (bar) setOffset(bar.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ready])
  return offset
}

export default function MenuPage() {
  const { menu, status, offline, retry } = useMenu()
  const { t, lang } = useI18n()
  const [view, setView] = useState<ViewMode>(readView)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dishId, setDishId] = useState<number | null>(dishIdFromHash)
  const [scrolled, setScrolled] = useState(false)
  const offset = useHeaderOffset(status === 'ready')
  const reduce = useReducedMotion()

  const categories = useMemo(() => menu?.categories ?? [], [menu])
  const settings = menu?.settings ?? null

  const lookup = useMemo(() => {
    const map = new Map<number, { product: Product; category: Category }>()
    for (const category of categories) for (const product of category.products) map.set(product.id, { product, category })
    return map
  }, [categories])

  const featured = useMemo(() => [...lookup.values()].filter(({ product }) => product.featured), [lookup])
  const active = useScrollSpy(
    categories.map((c) => c.slug),
    offset,
  )

  // Scroll progress bar + "solid" header state.
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Dish deep links (#dish-12): back button closes the sheet on phones.
  useEffect(() => {
    const onPop = () => setDishId(dishIdFromHash())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openDish = useCallback((product: Product) => {
    setSearchOpen(false)
    setDishId(product.id)
    const hash = `#dish-${product.id}`
    if (location.hash === hash) return
    if (dishIdFromHash() === null) history.pushState({ dish: product.id }, '', hash)
    else history.replaceState({ dish: product.id }, '', hash)
  }, [])

  const closeDish = useCallback(() => {
    setDishId(null)
    if (history.state?.dish) history.back()
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  }, [])

  const changeView = (next: ViewMode) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  // "/" focuses search like most sites do.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = lang === 'ar' ? `${settings?.name_ar ?? 'بوريك تايم'} — القائمة` : `${settings?.name_en ?? 'Börek Time'} — Menu`
  }, [lang, settings])

  const jumpTo = (slug: string) => scrollToSection(slug, offset - 1)
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const explore = () => {
    const first = document.getElementById('menu-start')
    if (first) window.scrollTo({ top: first.getBoundingClientRect().top + window.scrollY - 8, behavior: 'smooth' })
  }

  const selection = dishId != null ? (lookup.get(dishId) ?? null) : null

  return (
    <div className="menu-page">
      <Intro />
      <motion.div className="progress" style={{ scaleX: progress }} aria-hidden="true" />

      <Hero settings={settings} onExplore={explore} delay={introPlaying && !reduce ? 2.6 : 0.1} />

      <main id="menu-start" className="menu-main">
        {status === 'ready' && (
          <TopBar
            categories={categories}
            active={active}
            solid={scrolled}
            view={view}
            onView={changeView}
            onJump={jumpTo}
            onSearch={() => setSearchOpen(true)}
            onTop={toTop}
          />
        )}

        {status === 'loading' && (
          <div className="container state">
            <div className="skeleton-grid">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
            <p className="state__text">{t('loading')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="container state">
            <p className="state__title">{t('loadError')}</p>
            <button className="btn" onClick={retry}>
              {t('retry')}
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <FeaturedStrip items={featured} settings={settings} onOpen={openDish} />
            <div className="container sections">
              {categories.map((category) => (
                <MenuSection key={category.slug} category={category} settings={settings} view={view} onOpen={openDish} />
              ))}
            </div>
          </>
        )}
      </main>

      {status === 'ready' && <Footer settings={settings} onTop={toTop} />}

      <AnimatePresence>
        {scrolled && (
          <motion.button
            className="fab"
            onClick={toTop}
            aria-label={t('backToTop')}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg className="fab__ring" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="22" />
              <motion.circle cx="24" cy="24" r="22" style={{ pathLength: progress }} />
            </svg>
            <ArrowUpIcon size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offline && (
          <motion.div className="offline" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}>
            {t('offline')}
          </motion.div>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} categories={categories} settings={settings} onClose={() => setSearchOpen(false)} onSelect={openDish} />
      <ProductSheet selection={selection} settings={settings} onClose={closeDish} onNavigate={openDish} />
    </div>
  )
}
