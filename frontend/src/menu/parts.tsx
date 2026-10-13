import { useState } from 'react'
import { TagIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatPrice } from '../lib/text'
import type { Product, Settings, Tag } from '../types'
import { Plate } from './Plate'

export function Price({ value, settings, className = 'price' }: { value: number; settings: Settings | null; className?: string }) {
  const { lang } = useI18n()
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en

  return (
    <span className={className}>
      {formatPrice(value, lang)}
      {currency && <span className="price__cur"> {currency}</span>}
    </span>
  )
}

export function Tags({ tags }: { tags: Tag[] }) {
  const { t } = useI18n()
  if (!tags.length) return null

  return (
    <ul className="tags">
      {tags.map((tag) => (
        <li key={tag} className={`tag tag--${tag}`}>
          <TagIcon tag={tag} size={12} />
          {t(`tag_${tag}`)}
        </li>
      ))}
    </ul>
  )
}

/** The dish photo when uploaded, otherwise the turning porcelain plate. */
export function DishMedia({ product, icon, size = 'm', spin = true }: { product: Product; icon: string; size?: 'g' | 'm' | 'xl'; spin?: boolean }) {
  const [loaded, setLoaded] = useState(false)

  if (product.image) {
    return (
      <div className={`photo photo--${size}${loaded ? ' is-loaded' : ''}`}>
        <img src={product.image} alt="" loading={size === 'xl' ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} />
      </div>
    )
  }

  return <Plate icon={icon} seed={product.id} size={size} spin={spin} />
}
