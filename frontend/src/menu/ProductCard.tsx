import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { PointerEvent } from 'react'
import { useI18n } from '../lib/i18n'
import type { Product, Settings } from '../types'
import { DishMedia, Price, Tags } from './parts'

type Props = {
  product: Product
  icon: string
  settings: Settings | null
  index: number
  onOpen: (product: Product) => void
}

const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

export function ProductCard({ product, icon, settings, index, onOpen }: Props) {
  const { lang, pick, other, t } = useI18n()
  const reduce = useReducedMotion()

  // Pointer-driven 3D tilt and light sheen (desktop only).
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 200, damping: 20 })
  const sheenX = useTransform(px, (v) => `${v * 100}%`)
  const sheenY = useTransform(py, (v) => `${v * 100}%`)
  const sheen = useMotionTemplate`radial-gradient(420px circle at ${sheenX} ${sheenY}, rgba(255,240,215,.55), transparent 45%)`
  const tilt = canHover && !reduce

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!tilt) return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  const description = pick(product.description)

  return (
    <motion.article
      className={`card${product.featured ? ' card--featured' : ''}`}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.6, delay: Math.min(index % 4, 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={tilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <button className="card__hit" onClick={() => onOpen(product)} aria-label={`${pick(product.name)} — ${t('tapForDetails')}`} />
      {tilt && <motion.span className="card__sheen" style={{ background: sheen }} aria-hidden="true" />}

      <motion.div className="card__media" layoutId={`dish-media-${product.id}`}>
        <DishMedia product={product} icon={icon} />
        {product.featured && <span className="card__ribbon">{t('chefsPicks')}</span>}
      </motion.div>

      <div className="card__body">
        <h3 className="card__name">{pick(product.name)}</h3>
        <p className="card__alt" lang={lang === 'en' ? 'ar' : 'en'}>
          {other(product.name)}
        </p>
        {description && <p className="card__desc">{description}</p>}
        <div className="card__foot">
          <Price value={product.price} settings={settings} />
          <Tags tags={product.tags} compact />
        </div>
      </div>
    </motion.article>
  )
}

export function ProductRow({ product, settings, index, onOpen }: Props) {
  const { pick, other } = useI18n()
  const reduce = useReducedMotion()
  const description = pick(product.description)

  return (
    <motion.li
      className="row"
      initial={reduce ? false : { opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '0px 0px -30px 0px' }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.03 }}
    >
      <button className="row__hit" onClick={() => onOpen(product)}>
        <span className="row__main">
          <span className="row__line">
            <span className="row__name">{pick(product.name)}</span>
            <Tags tags={product.tags} compact />
            <span className="row__dots" aria-hidden="true" />
            <Price value={product.price} settings={settings} className="price price--row" />
          </span>
          <span className="row__alt">{other(product.name)}</span>
          {description && <span className="row__desc">{description}</span>}
        </span>
      </button>
    </motion.li>
  )
}
