import { AnimatePresence, motion } from 'motion/react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { CloseIcon, SearchIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, highlightParts, normalize } from '../lib/text'
import type { Category, Product, Settings } from '../types'
import { DishMedia, Price } from './parts'

type Props = {
  open: boolean
  categories: Category[]
  settings: Settings | null
  onClose: () => void
  onSelect: (product: Product) => void
}

type Indexed = { product: Product; category: Category; haystack: string }

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((part, i) => (part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>))}
    </>
  )
}

export function SearchOverlay({ open, categories, settings, onClose, onSelect }: Props) {
  const { lang, pick, other, t } = useI18n()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const inputRef = useRef<HTMLInputElement>(null)

  const index = useMemo<Indexed[]>(
    () =>
      categories.flatMap((category) =>
        category.products.map((product) => ({
          product,
          category,
          haystack: normalize(
            [product.name.en, product.name.ar, product.description.en, product.description.ar, category.name.en, category.name.ar, product.code]
              .filter(Boolean)
              .join(' | '),
          ),
        })),
      ),
    [categories],
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
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

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
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="search__bar"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            <SearchIcon size={22} className="search__icon" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="search__close" onClick={onClose} aria-label={t('close')}>
              <CloseIcon size={22} />
            </button>
          </motion.div>

          <div className="search__results container">
            {deferred && (
              <p className="search__count" aria-live="polite">
                {formatInt(results.length, lang)} {t('results')}
              </p>
            )}

            {deferred && results.length === 0 && (
              <motion.div className="search__empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="search__empty-title">{t('noResults')}</p>
                <p>{t('noResultsHint')}</p>
              </motion.div>
            )}

            <ul className="search__list">
              {results.map(({ product, category }, i) => (
                <motion.li
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.025 }}
                >
                  <button className="search__item" onClick={() => onSelect(product)}>
                    <DishMedia product={product} icon={category.icon} size="thumb" />
                    <span className="search__text">
                      <span className="search__name">
                        <Highlight text={pick(product.name)} query={deferred} />
                      </span>
                      <span className="search__meta">
                        <Highlight text={other(product.name)} query={deferred} /> · {pick(category.name)}
                      </span>
                    </span>
                    <Price value={product.price} settings={settings} />
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
