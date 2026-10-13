import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Menu } from '../types'

const CACHE_KEY = 'bt_menu_cache_v2'

type State = {
  menu: Menu | null
  status: 'loading' | 'ready' | 'error'
  /** True when showing a cached copy because the network request failed. */
  offline: boolean
}

function readCache(): Menu | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Menu) : null
  } catch {
    return null
  }
}

function writeCache(menu: Menu) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(menu))
  } catch {
    /* quota or privacy mode: fine, we just won't have an offline copy */
  }
}

/**
 * Stale-while-revalidate: paint instantly from the last menu this phone saw,
 * then refresh from the API in the background.
 */
export function useMenu() {
  const [state, setState] = useState<State>(() => {
    const cached = readCache()
    return { menu: cached, status: cached ? 'ready' : 'loading', offline: false }
  })

  const load = useCallback(async () => {
    try {
      const fresh = await api<Menu>('/menu')
      writeCache(fresh)
      setState((prev) =>
        prev.menu?.version === fresh.version && prev.status === 'ready'
          ? { ...prev, offline: false }
          : { menu: fresh, status: 'ready', offline: false },
      )
    } catch {
      setState((prev) => (prev.menu ? { ...prev, offline: true } : { menu: null, status: 'error', offline: false }))
    }
  }, [])

  useEffect(() => {
    void load()
    const onOnline = () => void load()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [load])

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: prev.menu ? 'ready' : 'loading' }))
    void load()
  }, [load])

  return { ...state, retry }
}
