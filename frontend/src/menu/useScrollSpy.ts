import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently under the sticky header.
 * A rAF-throttled scroll listener is steadier than IntersectionObserver for
 * sections of very different heights (one-dish Breakfast vs. 13 pies).
 */
export function useScrollSpy(ids: string[], offset: number): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('|')

  useEffect(() => {
    if (!ids.length) return
    let frame = 0

    const measure = () => {
      frame = 0
      const line = offset + 8
      let current: string | null = null

      for (const id of ids) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top - line <= 0) current = id
        else break
      }

      // At the very bottom, the last section wins even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1]
      }

      setActive(current)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, offset])

  return active
}

/** Smooth-scrolls to a section, accounting for the sticky header. */
export function scrollToSection(id: string, offset: number) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}
