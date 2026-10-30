import { AnimatePresence, motion } from 'motion/react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseIcon, SearchIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, highlightParts, normalize } from '../lib/text'
import type { Category, Group, Product, Settings } from '../types'
import { DishMedia, Price } from './parts'

type Props = {
  open: boolean
  groups: Group[]
  settings: Settings | null
  onClose: () => void
}

type Indexed = { product: Product; section: Category; group: Group; haystack: string }

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  )
}

/** Instant search across every dish, in English or Arabic. */
export function SearchOverlay({ open, groups, settings, onClose }: Props) {
  const { lang, pick, t } = useI18n()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo<Indexed[]>(
    () =>
      groups.flatMap((group) =>
        group.sections.flatMap((section) =>
          section.products.map((product) => ({
            product,
            section,
            group,
            haystack: normalize(
              [product.name.en, product.name.ar, product.description.en, product.description.ar, section.name.en, section.name.ar, product.code]
                .filter(Boolean)
                .join(' | '),
            ),
          })),
        ),
      ),
    [groups],
  )

  const results = useMemo(() => {
    const q = normalize(deferred)
    if (!q) return []
    const words = q.split(' ')
    return index.filter((item) => words.every((w) => item.haystack.includes(w)))
  }, [deferred, index])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      setQuery('')
    }
  }, [open, onClose])

  const select = (item: Indexed) => {
    onClose()
    navigate(`/menu/${item.group.slug}/${item.product.id}`, { state: { modal: true } })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="search"
          role="dialog"
          aria-modal="true"
          aria-label={t('search')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div className="search__bar container" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}>
            <label className="search__field">
              <SearchIcon size={18} />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={t('searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="round-btn" onClick={onClose} aria-label={t('close')}>
              <CloseIcon size={18} />
            </button>
          </motion.div>

          <div className="search__results container">
            {deferred && (
              <p className="eyebrow eyebrow--muted" aria-live="polite">
                {formatInt(results.length, lang)} {t('results')}
              </p>
            )}
            {deferred && results.length === 0 && (
              <div className="search__empty">
                <p className="search__empty-title">{t('noResults')}</p>
                <p>{t('noResultsHint')}</p>
              </div>
            )}
            <ul className="search__list">
              {results.map((item, i) => (
                <motion.li key={item.product.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }}>
                  <button className="search__item" onClick={() => select(item)}>
                    <DishMedia product={item.product} icon={item.section.icon} size="g" spin={false} />
                    <span className="search__text">
                      <span className="search__name">
                        <Highlight text={pick(item.product.name)} query={deferred} />
                      </span>
                      <span className="search__meta">{pick(item.section.name)}</span>
                    </span>
                    <Price value={item.product.price} settings={settings} className="card__price" from={!!item.product.sizes?.length} />
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
