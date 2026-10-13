import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { CategoryIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category } from '../types'

const EASE = [0.2, 0.7, 0.3, 1] as const

type Props = {
  section: Category
  headingId: string
  /** Position in the group, shown as a large outlined number. */
  index?: number
}

/**
 * Banner that opens each section. With a cover photo (uploaded in the admin)
 * it reveals, slowly zooms out and drifts with the scroll; without one it is
 * a wine panel with the section's motif.
 */
export function SectionBanner({ section, headingId, index }: Props) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-12%', '12%'])
  const count = section.products.length

  return (
    <motion.div
      ref={ref}
      className={`banner${section.image ? '' : ' banner--art'}`}
      initial={reduce ? false : { clipPath: 'inset(8% 6% 8% 6% round 22px)', opacity: 0 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 22px)', opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      {section.image ? (
        <motion.div className="banner__media" style={{ y }}>
          <motion.img
            src={section.image}
            alt=""
            loading="lazy"
            initial={reduce ? false : { scale: 1.25 }}
            whileInView={{ scale: 1.1 }}
            viewport={{ once: true }}
            transition={{ duration: 2.4, ease: EASE }}
          />
        </motion.div>
      ) : (
        <div className="banner__pattern" aria-hidden="true">
          <motion.span className="banner__motif" style={{ y }}>
            <CategoryIcon name={section.icon} strokeWidth={0.8} />
          </motion.span>
        </div>
      )}

      <span className="banner__shade" />
      {index != null && (
        <span className="banner__num" aria-hidden="true">
          {formatInt(index + 1, lang).padStart(2, lang === 'ar' ? '٠' : '0')}
        </span>
      )}
      {section.image && section.image_credit && <span className="banner__credit">{section.image_credit}</span>}

      <div className="banner__text">
        <motion.span
          className="banner__icon"
          initial={reduce ? false : { scale: 0.5, opacity: 0, rotate: -20 }}
          whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.3 }}
        >
          <CategoryIcon name={section.icon} strokeWidth={1.3} />
        </motion.span>
        <div>
          <h2 id={headingId} className="banner__title">
            {pick(section.name)}
          </h2>
          {pick(section.description) && <p className="banner__desc">{pick(section.description)}</p>}
        </div>
        <span className="banner__count">
          {formatInt(count, lang)} {t(count === 1 ? 'item' : 'items')}
        </span>
      </div>
    </motion.div>
  )
}
