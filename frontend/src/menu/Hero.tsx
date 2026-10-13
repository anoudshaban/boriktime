import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useMemo, useRef, type CSSProperties } from 'react'
import { Logo } from '../components/brand/Logo'
import { ChevronIcon } from '../components/icons'
import { useI18n } from '../lib/i18n'
import type { Settings } from '../types'

type Props = { settings: Settings | null; onExplore: () => void; delay: number }

/** Deterministic pseudo-random so particles don't jump between renders. */
function seeded(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export function Hero({ settings, onExplore, delay }: Props) {
  const { lang, t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const logoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 140])
  const logoScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.86])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${seeded(i) * 100}%`,
        size: 2 + seeded(i + 40) * 4,
        duration: 9 + seeded(i + 80) * 12,
        delay: -seeded(i + 120) * 20,
        drift: (seeded(i + 160) - 0.5) * 80,
      })),
    [],
  )

  const tagline = lang === 'ar' ? settings?.tagline_ar : settings?.tagline_en

  return (
    <header className="hero" ref={ref}>
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__glow" />
        <div className="hero__rings" />
        {particles.map((p, i) => (
          <span
            key={i}
            className="hero__flour"
            style={
              {
                left: p.left,
                width: p.size,
                height: p.size,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                '--drift': `${p.drift}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <motion.div className="hero__content" style={{ y: logoY, scale: logoScale, opacity: fade }}>
        <motion.div
          className="hero__logo"
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Logo motionMode="idle" title={settings?.name_en ?? 'Börek Time'} />
        </motion.div>

        {lang === 'ar' && (
          <motion.p
            className="hero__name-ar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4, duration: 0.8 }}
          >
            {settings?.name_ar ?? 'بوريك تايم'}
          </motion.p>
        )}

        {tagline && lang === 'ar' && (
          <motion.p
            className="hero__tagline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.5, duration: 0.8 }}
          >
            {tagline}
          </motion.p>
        )}

        <motion.button
          className="hero__cta"
          onClick={onExplore}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.7, duration: 0.7 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <span>{t('viewMenu')}</span>
          <ChevronIcon className="hero__cta-icon" size={18} />
        </motion.button>
      </motion.div>

      <svg className="hero__edge" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80V40C240 8 480 0 720 0s480 8 720 40v40H0Z" />
      </svg>
    </header>
  )
}
