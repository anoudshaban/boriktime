import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { CategoryIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import { formatInt } from '../lib/text'
import type { Category } from '../types'

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  section: Category
  headingId: string
  /** Position in the group, shown as a small gold number. */
  index?: number
}

/**
 * Opens each section: a wide photo that unveils and drifts with the scroll,
 * then a centred title between gold hairlines.
 */
export function SectionBanner({ section, headingId, index }: Props) {
  const { lang, pick, t } = useI18n()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-14%', '14%'])
  const count = section.products.length

  return (
    <motion.div className="sbanner" initial={reduce ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '-80px' }}>
      {section.image ? (
        <motion.div
          ref={ref}
          className="sbanner__photo"
          variants={{ hidden: { clipPath: 'inset(12% 8% 12% 8% round 24px)', opacity: 0.4 }, show: { clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1 } }}
          transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img src={section.image} alt="" loading="lazy" style={{ y }} variants={{ hidden: { scale: 1.3 }, show: { scale: 1.1 } }} transition={{ duration: 2.2, ease: EASE }} />
          {section.image_credit && <span className="banner__credit">{section.image_credit}</span>}
        </motion.div>
      ) : (
        <div className="sbanner__icon">
          <CategoryIcon name={section.icon} strokeWidth={1.1} />
        </div>
      )}

      <motion.div className="sbanner__text" variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 1, delay: 0.25, ease: EASE }}>
        {index != null && <span className="sbanner__num">{formatInt(index + 1, lang).padStart(2, lang === 'ar' ? '٠' : '0')}</span>}
        <h2 id={headingId} className="sbanner__title">
          {pick(section.name)}
        </h2>
        <span className="sbanner__rule">
          <i />
          <CategoryIcon name={section.icon} size={16} strokeWidth={1.3} />
          <i />
        </span>
        {pick(section.description) && <p className="sbanner__desc">{pick(section.description)}</p>}
        <span className="lux-eyebrow lux-eyebrow--sm">
          {formatInt(count, lang)} {t(count === 1 ? 'item' : 'items')}
        </span>
      </motion.div>
    </motion.div>
  )
}
