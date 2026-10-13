import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { ChevronIcon, SearchIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

type Props = {
  /** Where the back button goes; omitted on the home page. */
  backTo?: string
  /** Show the logo even before scrolling (inner pages). */
  showLogo?: boolean
  /** Uploaded logo from the admin, if any. */
  logoUrl?: string | null
  onSearch: () => void
}

/**
 * Floating top bar over every page: transparent over the hero photos, turning
 * into frosted glass once the page scrolls.
 */
export function TopNav({ backTo, showLogo = true, logoUrl, onSearch }: Props) {
  const { lang, t, toggle } = useI18n()
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const logoVisible = showLogo || solid

  return (
    <header className={`top${solid ? ' is-solid' : ''}`}>
      <div className="top__row container">
        <div className="top__side">
          {backTo && (
            <Link to={backTo} className="round-btn round-btn--glass" aria-label={t('back')}>
              <ChevronIcon size={16} className="flip-back" />
            </Link>
          )}
        </div>

        <div className="top__center">
          <AnimatePresence>
            {logoVisible && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                <Link to="/" aria-label="Börek Time" className="top__logo">
                  {logoUrl ? <img src={logoUrl} alt="" className="brand-img" /> : <Logo />}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="top__side top__side--end">
          <button className="round-btn round-btn--glass" onClick={onSearch} aria-label={t('search')}>
            <SearchIcon size={16} />
          </button>
          <button className="lang" onClick={toggle} aria-label={t('language')} lang={lang === 'en' ? 'ar' : 'en'}>
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>
        </div>
      </div>
    </header>
  )
}
