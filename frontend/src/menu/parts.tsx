import { useState, type CSSProperties } from 'react'
import { TagIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatPrice } from '../lib/text'
import type { Product, Settings, Tag } from '../types'
import { Plate } from './Plate'

type PriceProps = {
  value: number
  /** Offer price: shown instead of `value`, which is then crossed out. */
  sale?: number | null
  settings: Settings | null
  className?: string
}

export function Price({ value, sale, settings, className = 'price' }: PriceProps) {
  const { lang } = useI18n()
  const currency = lang === 'ar' ? settings?.currency_ar : settings?.currency_en
  const onSale = sale != null && sale < value

  return (
    <span className={`${className}${onSale ? ' is-sale' : ''}`}>
      {onSale && <s className="price__was">{formatPrice(value, lang)}</s>}
      {formatPrice(onSale ? sale : value, lang)}
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
/** Sections whose dishes are served hot: their photos get rising steam. */
const HOT = new Set(['breakfast', 'bakery', 'hot-mezze', 'fatteh', 'main-course', 'hot-drinks'])

export function DishMedia({
  product,
  icon,
  size = 'm',
  spin = true,
  live = false,
  section,
}: {
  product: Product
  icon: string
  size?: 'g' | 'm' | 'xl' | 'fill'
  spin?: boolean
  /** Slow zoom/pan loop (and steam for hot dishes), like a GIF. */
  live?: boolean
  section?: string
}) {
  const [loaded, setLoaded] = useState(false)

  if (product.video && size !== 'g') {
    const gif = /\.gif(\?|$)/i.test(product.video)
    return (
      <div className={`photo photo--${size} is-loaded photo--video`}>
        {gif ? (
          <img src={product.video} alt="" />
        ) : (
          <video src={product.video} poster={product.image ?? undefined} autoPlay muted loop playsInline preload="metadata" />
        )}
      </div>
    )
  }

  if (product.image) {
    return (
      <div className={`photo photo--${size}${loaded ? ' is-loaded' : ''}${live ? ' photo--live' : ''}`} style={live ? ({ '--live-delay': `${-(product.id % 9) * 1.7}s` } as CSSProperties) : undefined}>
        <img src={product.image} alt="" loading={size === 'xl' ? 'eager' : 'lazy'} decoding="async" onLoad={() => setLoaded(true)} />
        {live && section && HOT.has(section) && (
          <span className="steam" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
    )
  }

  if (size === 'fill') {
    return (
      <div className="photo photo--fill photo--empty">
        <Plate icon={icon} seed={product.id} size="m" spin={spin} />
      </div>
    )
  }
  return <Plate icon={icon} seed={product.id} size={size} spin={spin} />
}

/**
 * Direction A: the dish served on a round porcelain plate, tilted toward the
 * guest and turning slowly. Shows the uploaded GIF/video, the photo, or the
 * illustrated plate when there is neither.
 */
export function DishPlate({ product, icon, size = 'm', spin = true }: { product: Product; icon: string; size?: 's' | 'm' | 'l' | 'xl'; spin?: boolean }) {
  const delay = { '--d': `${-(product.id % 11) * 4}s` } as CSSProperties
  const media = product.video ? (
    /\.gif(\?|$)/i.test(product.video) ? (
      <img src={product.video} alt="" />
    ) : (
      <video src={product.video} poster={product.image ?? undefined} autoPlay muted loop playsInline preload="metadata" />
    )
  ) : product.image ? (
    <img src={product.image} alt="" loading={size === 'xl' ? 'eager' : 'lazy'} decoding="async" className={spin ? 'dp__spin' : undefined} />
  ) : null

  if (!media) return <Plate icon={icon} seed={product.id} size={size === 'xl' ? 'xl' : size === 's' ? 'g' : 'm'} spin={spin} />

  return (
    <span className={`dp dp--${size}`} style={delay} aria-hidden="true">
      <span className="dp__shadow" />
      <span className="dp__tilt">
        <span className="dp__rim">
          <span className="dp__food">{media}</span>
        </span>
      </span>
    </span>
  )
}
