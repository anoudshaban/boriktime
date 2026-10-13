import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { useI18n } from '../lib/i18n'
import { DishView } from './DishView'
import { GroupPage } from './GroupPage'
import { Home } from './Home'
import { SearchOverlay } from './SearchOverlay'
import { TopNav } from './TopNav'
import { useMenu } from './useMenu'
import './menu.css'

const SEEN_KEY = 'bt_logo_drawn'

function takeFirstVisit(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* private mode: just animate */
  }
  return true
}

/**
 * Public menu: "/" home → "/menu/:group" sections → "/menu/:group/:dish" quick view.
 * The dish view is layered over its group page so closing it keeps your place.
 */
export default function MenuApp() {
  const { menu, status, offline, retry } = useMenu()
  const { lang, pick, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [firstVisit] = useState(takeFirstVisit)

  const groups = useMemo(() => menu?.groups ?? [], [menu])
  const settings = menu?.settings ?? null

  const dishMatch = matchPath('/menu/:group/:dish', location.pathname)
  const groupMatch = dishMatch ?? matchPath('/menu/:group', location.pathname)
  const group = groupMatch ? groups.find((g) => g.slug === groupMatch.params.group) : undefined

  const dish = useMemo(() => {
    if (!group || !dishMatch) return null
    const id = Number(dishMatch.params.dish)
    for (const section of group.sections) {
      const product = section.products.find((p) => p.id === id)
      if (product) return { product, section }
    }
    return null
  }, [group, dishMatch])

  // New page → start at the top (but not when a dish opens over its group).
  const pageKey = group ? `g-${group.slug}` : groupMatch ? 'missing' : 'home'
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pageKey])

  useEffect(() => {
    const brand = lang === 'ar' ? (settings?.name_ar ?? 'بوريك تايم') : (settings?.name_en ?? 'Börek Time')
    const page = dish ? pick(dish.product.name) : group ? pick(group.name) : t('menu')
    document.title = `${page} — ${brand}`
  }, [lang, settings, group, dish, pick, t])

  const closeDish = useCallback(() => {
    if (!group) return
    if ((location.state as { modal?: boolean } | null)?.modal) navigate(-1)
    else navigate(`/menu/${group.slug}`, { replace: true })
  }, [group, location.state, navigate])

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // "/" opens search, like most sites.
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

  return (
    <div className="menu">
      <TopNav backTo={groupMatch ? '/' : undefined} showLogo={Boolean(groupMatch)} onSearch={openSearch} />

      {status === 'loading' && (
        <div className="state">
          <motion.div className="state__logo" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <Logo markOnly />
          </motion.div>
          <p className="note">{t('loading')}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="state">
          <p className="note">{t('loadError')}</p>
          <button className="pill-btn" onClick={retry}>
            {t('retry')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div key={pageKey}>
          {!groupMatch && <Home groups={groups} settings={settings} firstVisit={firstVisit} />}
          {group && <GroupPage group={group} settings={settings} />}
          {groupMatch && !group && (
            <main className="view state">
              <p className="note">{t('notFound')}</p>
              <Link to="/" className="pill-btn">
                {t('home')}
              </Link>
            </main>
          )}
        </div>
      )}

      <AnimatePresence>
        {group && dish && (
          <DishView key="dish" group={group} section={dish.section} product={dish.product} settings={settings} onClose={closeDish} />
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} groups={groups} settings={settings} onClose={closeSearch} />

      <AnimatePresence>
        {offline && (
          <motion.div className="offline" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}>
            {t('offline')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
