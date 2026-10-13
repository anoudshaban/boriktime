import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { LOGO_PATH } from './logoPath'

type Props = {
  className?: string
  /** 'intro' draws the logo in layers, 'idle' lets the wheat sway, 'none' is static. */
  motionMode?: 'intro' | 'idle' | 'none'
  /** Show only the wheat stalk (for compact headers). */
  markOnly?: boolean
  title?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The official logo, traced to a single vector path and split into three
 * clip regions (wheat, wordmark, tagline) so each part can animate separately.
 */
export function Logo({ className, motionMode = 'none', markOnly = false, title = 'Börek Time' }: Props) {
  const id = useId().replace(/:/g, '')
  const reduce = useReducedMotion()
  const mode = reduce ? 'none' : motionMode
  const intro = mode === 'intro'

  const viewBox = markOnly ? '395 40 1075 470' : '60 45 1490 715'

  return (
    <svg className={className} viewBox={viewBox} role="img" aria-label={title} fill="currentColor">
      <defs>
        <clipPath id={`${id}-wheat`}>
          <rect x="0" y="0" width="1600" height="462" />
          <rect x="420" y="462" width="1180" height="40" />
        </clipPath>
        <clipPath id={`${id}-word`}>
          {intro ? (
            <motion.rect
              x="0"
              y="462"
              height="225"
              initial={{ width: 0 }}
              animate={{ width: 1600 }}
              transition={{ duration: 1.1, delay: 1.0, ease: EASE }}
            />
          ) : (
            <rect x="0" y="462" width="1600" height="225" />
          )}
        </clipPath>
        <clipPath id={`${id}-tag`}>
          <rect x="0" y="687" width="1600" height="113" />
        </clipPath>
        <clipPath id={`${id}-word-safe`}>
          <rect x="0" y="462" width="420" height="225" />
          <rect x="0" y="502" width="1600" height="185" />
        </clipPath>
      </defs>

      {/* Wheat stalk */}
      <motion.g
        clipPath={`url(#${id}-wheat)`}
        style={{ transformOrigin: '1440px 440px', transformBox: 'view-box' }}
        animate={mode === 'idle' ? { rotate: [0, -1.6, 0, 1.1, 0] } : undefined}
        transition={mode === 'idle' ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        {intro ? (
          <>
            <motion.path
              d={LOGO_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 0 }}
              transition={{ pathLength: { duration: 1.4, ease: 'easeInOut' }, opacity: { delay: 1.3, duration: 0.5 } }}
            />
            <motion.path
              d={LOGO_PATH}
              fillRule="evenodd"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            />
          </>
        ) : (
          <path d={LOGO_PATH} fillRule="evenodd" />
        )}
      </motion.g>

      {!markOnly && (
        <>
          {/* BÖREK TiME wordmark: wipes in left to right */}
          <g clipPath={`url(#${id}-word)`}>
            <g clipPath={`url(#${id}-word-safe)`}>
              <path d={LOGO_PATH} fillRule="evenodd" />
            </g>
          </g>

          {/* RESTAURANT & CAFE SINCE 2020 */}
          <motion.g
            clipPath={`url(#${id}-tag)`}
            initial={intro ? { opacity: 0, y: 24 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8, ease: EASE }}
          >
            <path d={LOGO_PATH} fillRule="evenodd" />
          </motion.g>
        </>
      )}
    </svg>
  )
}
