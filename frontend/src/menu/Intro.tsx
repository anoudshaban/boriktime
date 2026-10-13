import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Logo } from '../components/brand/Logo'
import { useI18n } from '../lib/i18n'

const SEEN_KEY = 'bt_intro_seen'
const DURATION_MS = 3000

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Opening curtain: the logo draws itself, then the curtain lifts to reveal
 * the menu. Shown once per visit; tap anywhere to skip.
 */
export function Intro() {
  const reduce = useReducedMotion()
  const { t } = useI18n()
  const [visible, setVisible] = useState(() => !alreadySeen() && !reduce)

  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => setVisible(false), DURATION_MS)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="intro"
          onClick={() => setVisible(false)}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          role="presentation"
        >
          <motion.div
            className="intro__glow"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          <motion.div
            className="intro__logo"
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeIn' }}
          >
            <Logo motionMode="intro" />
          </motion.div>
          <motion.div
            className="intro__line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DURATION_MS / 1000 - 0.2, ease: 'linear' }}
          />
          <button className="intro__skip" onClick={() => setVisible(false)}>
            {t('skip')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
