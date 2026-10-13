import { Link } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { ChevronIcon, SearchIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'

type Props = {
  /** Where the back button goes; omitted on the home page. */
  backTo?: string
  showLogo?: boolean
  /** Uploaded logo from the admin, if any. */
  logoUrl?: string | null
  onSearch: () => void
}

/** Thin top row shared by every page: back · logo · search · language. */
export function TopNav({ backTo, showLogo = true, logoUrl, onSearch }: Props) {
  const { lang, t, toggle } = useI18n()

  return (
    <header className="top container">
      {backTo ? (
        <Link to={backTo} className="round-btn" aria-label={t('back')}>
          <ChevronIcon size={16} className="flip-back" />
        </Link>
      ) : (
        <span className="round-btn round-btn--ghost" />
      )}

      <div className="top__center">
        {showLogo && (
          <Link to="/" aria-label="Börek Time" className="top__logo">
            {logoUrl ? <img src={logoUrl} alt="" className="brand-img" /> : <Logo />}
          </Link>
        )}
      </div>

      <div className="top__actions">
        <button className="round-btn" onClick={onSearch} aria-label={t('search')}>
          <SearchIcon size={16} />
        </button>
        <button className="lang" onClick={toggle} aria-label={t('language')} lang={lang === 'en' ? 'ar' : 'en'}>
          {lang === 'en' ? 'ع' : 'EN'}
        </button>
      </div>
    </header>
  )
}
