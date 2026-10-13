import { useState, type CSSProperties } from 'react'
import { CategoryIcon, TagIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt, formatPrice } from '../lib/text'
import type { Product, Settings, Tag } from '../types'

export function Price({ value, settings, className = 'price' }: { value: number; settings: Settings | null; className?: string }) {
  const { lang } = useI18n()
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en

  return (
    <span className={className}>
      <span className="price__value">{formatPrice(value, lang)}</span>
      {currency && <span className="price__currency">{currency}</span>}
    </span>
  )
}

export function Tags({ tags, compact = false }: { tags: Tag[]; compact?: boolean }) {
  const { t } = useI18n()
  if (!tags.length) return null

  return (
    <ul className={`tags${compact ? ' tags--compact' : ''}`}>
      {tags.map((tag) => (
        <li key={tag} className={`tag tag--${tag}`} title={t(`tag_${tag}`)}>
          <TagIcon tag={tag} size={compact ? 13 : 15} />
          {!compact && <span>{t(`tag_${tag}`)}</span>}
          {compact && <span className="sr-only">{t(`tag_${tag}`)}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * Photo when the restaurant has uploaded one; otherwise a designed plate
 * with the section's icon, so the menu looks finished from day one.
 */
export function DishMedia({ product, icon, size = 'card' }: { product: Product; icon: string; size?: 'card' | 'sheet' | 'thumb' }) {
  const { lang } = useI18n()
  const [loaded, setLoaded] = useState(false)

  if (product.image) {
    return (
      <div className={`dish-media dish-media--${size} dish-media--photo${loaded ? ' is-loaded' : ''}`}>
        <img
          src={product.image}
          alt=""
          loading={size === 'sheet' ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      </div>
    )
  }

  return (
    <div className={`dish-media dish-media--${size} dish-art`} style={{ '--tilt': `${(product.id * 47) % 360}deg` } as CSSProperties}>
      <span className="dish-art__plate" />
      <CategoryIcon name={icon} className="dish-art__icon" strokeWidth={1.1} />
      {product.code != null && size !== 'thumb' && <span className="dish-art__code">{formatInt(product.code, lang)}</span>}
    </div>
  )
}
