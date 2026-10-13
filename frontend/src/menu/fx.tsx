import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Logo } from '../components/brand/Logo'

const EASE = [0.2, 0.7, 0.3, 1] as const
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/* ---------------------------------------------------------------
   Words rise one by one from behind a mask.
   --------------------------------------------------------------- */
export function SplitText({ text, delay = 0, stagger = 0.05, inView = false, className }: { text: string; delay?: number; stagger?: number; inView?: boolean; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={className}>{text}</span>
  const words = text.split(/\s+/).filter(Boolean)
  // The trigger sits on the wrapper: the masked words themselves never
  // "intersect" while they are hidden below their clip.
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, margin: '-40px' } } : { animate: 'show' }
  return (
    <motion.span className={`split ${className ?? ''}`} aria-label={text} initial="hidden" {...trigger}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split__w" aria-hidden="true">
            <motion.span
              className="split__i"
              variants={{ hidden: { y: '110%', opacity: 0 }, show: { y: '0%', opacity: 1 } }}
              transition={{ duration: 0.9, ease: EASE, delay: delay + i * stagger }}
            >
              {w}
            </motion.span>
          </span>{' '}
        </Fragment>
      ))}
    </motion.span>
  )
}

/* ---------------------------------------------------------------
   Element drifts toward the cursor while hovered (desktop).
   --------------------------------------------------------------- */
export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, { stiffness: 200, damping: 15 })
  const y = useSpring(0, { stiffness: 200, damping: 15 })
  return (
    <motion.div
      ref={ref}
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (!canHover() || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - r.left - r.width / 2) * strength)
        y.set((e.clientY - r.top - r.height / 2) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/* ---------------------------------------------------------------
   3D tilt + light glare that follows the pointer (desktop).
   --------------------------------------------------------------- */
export function useTilt<T extends HTMLElement>(max = 8) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !canHover() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-6px)`
        el.style.setProperty('--gx', `${px * 100}%`)
        el.style.setProperty('--gy', `${py * 100}%`)
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      el.style.transform = ''
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [max])
  return ref
}

/* ---------------------------------------------------------------
   Custom cursor: a dot plus a ring that grows into a "View" bubble
   over anything with data-cursor="…" (desktop only).
   --------------------------------------------------------------- */
export function Cursor() {
  const [enabled] = useState(canHover)
  const reduce = useReducedMotion()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const rx = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 })
  const ry = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 })
  const [label, setLabel] = useState<string | null>(null)
  const [down, setDown] = useState(false)

  useEffect(() => {
    if (!enabled || reduce) return
    const move = (e: PointerEvent) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]')
      setLabel(el?.dataset.cursor ?? null)
    }
    const d = () => setDown(true)
    const u = () => setDown(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', d)
    window.addEventListener('pointerup', u)
    document.documentElement.classList.add('has-cursor')
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', d)
      window.removeEventListener('pointerup', u)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [enabled, reduce, x, y])

  if (!enabled || reduce) return null
  return (
    <>
      <motion.div className="cursor-dot" style={{ x, y }} />
      <motion.div className={`cursor-ring${label ? ' is-label' : ''}`} style={{ x: rx, y: ry }} animate={{ scale: down ? 0.8 : 1 }}>
        <AnimatePresence>
          {label && (
            <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

/* ---------------------------------------------------------------
   Thin burgundy reading-progress bar.
   --------------------------------------------------------------- */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })
  return <motion.div className="progress" style={{ scaleX }} aria-hidden="true" />
}

/* ---------------------------------------------------------------
   Burgundy + gold curtain that lifts off each new page.
   --------------------------------------------------------------- */
export function PageWipe() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <>
      <motion.div className="wipe wipe--gold" initial={{ y: '0%' }} animate={{ y: '-100%' }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: 0.12 }} />
      <motion.div className="wipe" initial={{ y: '0%' }} animate={{ y: '-100%' }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} />
    </>
  )
}

/* ---------------------------------------------------------------
   First-visit preloader: the logo draws itself, a counter runs to
   100, then the cream curtain lifts.
   --------------------------------------------------------------- */
export const PRELOAD_MS = 2600

export function Preloader({ show }: { show: boolean }) {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(show && !reduce)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!visible) return
    document.body.style.overflow = 'hidden'
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (PRELOAD_MS - 300))
      setCount(Math.round(100 * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const done = window.setTimeout(() => setVisible(false), PRELOAD_MS)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(done)
      document.body.style.overflow = ''
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="preload" exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }} onClick={() => setVisible(false)}>
          <motion.div className="preload__logo" exit={{ y: -80, opacity: 0 }} transition={{ duration: 0.6 }}>
            <Logo motionMode="intro" />
          </motion.div>
          <div className="preload__bar">
            <motion.span style={{ scaleX: count / 100 } as CSSProperties} />
          </div>
          <span className="preload__count">{String(count).padStart(3, '0')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------
   Spinning circular text badge.
   --------------------------------------------------------------- */
export function RingText({ text, className, children }: { text: string; className?: string; children?: ReactNode }) {
  const id = useRef(`ring-${Math.random().toString(36).slice(2)}`).current
  return (
    <div className={`ringtext ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="ringtext__svg">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} startOffset="0" textLength="486" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <div className="ringtext__core">{children}</div>
    </div>
  )
}
