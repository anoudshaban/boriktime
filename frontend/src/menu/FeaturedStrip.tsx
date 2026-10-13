import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '../lib/i18n'
import type { Category, Product, Settings } from '../types'
import { DishMedia, Price } from './parts'

type Props = {
  items: { product: Product; category: Category }[]
  settings: Settings | null
  onOpen: (product: Product) => void
}

/** "Chef's picks": a swipeable strip of the dishes marked featured in the admin. */
export function FeaturedStrip({ items, settings, onOpen }: Props) {
  const { pick, t } = useI18n()
  const reduce = useReducedMotion()
  if (!items.length) return null

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="container">
        <motion.div
          className="featured__head"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="eyebrow">★ {t('chefsPicks')}</span>
          <h2 id="featured-title" className="featured__title">
            {t('chefsPicksSub')}
          </h2>
        </motion.div>
      </div>

      <div className="featured__track" role="list">
        {items.map(({ product, category }, i) => (
          <motion.button
            role="listitem"
            key={product.id}
            className="featured__item"
            onClick={() => onOpen(product)}
            initial={reduce ? false : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
          >
            <DishMedia product={product} icon={category.icon} />
            <span className="featured__shade" />
            <span className="featured__text">
              <span className="featured__cat">{pick(category.name)}</span>
              <span className="featured__name">{pick(product.name)}</span>
              <Price value={product.price} settings={settings} className="price price--light" />
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
