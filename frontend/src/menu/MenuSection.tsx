import { motion, useReducedMotion } from 'motion/react'
import { CategoryIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category, Product, Settings } from '../types'
import { ProductCard, ProductRow } from './ProductCard'
import type { ViewMode } from './TopBar'

type Props = {
  category: Category
  settings: Settings | null
  view: ViewMode
  onOpen: (product: Product) => void
}

export function MenuSection({ category, settings, view, onOpen }: Props) {
  const { lang, pick, other, t } = useI18n()
  const reduce = useReducedMotion()
  const description = pick(category.description)

  return (
    <section id={category.slug} className="section" aria-labelledby={`${category.slug}-title`}>
      <motion.header
        className="section__head"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '0px 0px -60px 0px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.span
          className="section__icon"
          initial={reduce ? false : { scale: 0.4, rotate: -30, opacity: 0 }}
          whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', damping: 14, stiffness: 160, delay: 0.1 }}
        >
          <CategoryIcon name={category.icon} size={30} strokeWidth={1.3} />
        </motion.span>
        <div className="section__titles">
          <h2 id={`${category.slug}-title`} className="section__title">
            {pick(category.name)}
          </h2>
          <p className="section__alt" lang={lang === 'en' ? 'ar' : 'en'}>
            {other(category.name)}
          </p>
        </div>
        <span className="section__count">
          {formatInt(category.products.length, lang)} {t(category.products.length === 1 ? 'item' : 'items')}
        </span>
        {description && <p className="section__desc">{description}</p>}
        <motion.span
          className="section__rule"
          aria-hidden="true"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.header>

      {view === 'grid' ? (
        <div className="grid">
          {category.products.map((product, i) => (
            <ProductCard key={product.id} product={product} icon={category.icon} settings={settings} index={i} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <ul className="rows">
          {category.products.map((product, i) => (
            <ProductRow key={product.id} product={product} icon={category.icon} settings={settings} index={i} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  )
}
