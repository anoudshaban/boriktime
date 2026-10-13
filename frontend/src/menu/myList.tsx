import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * "My list": guests collect dishes while browsing and show the list to the
 * waiter. Saved on the phone only — there is no online ordering.
 */
type Entry = { id: number; qty: number }

type MyList = {
  entries: Entry[]
  count: number
  qtyOf: (id: number) => number
  add: (id: number) => void
  remove: (id: number) => void
  clear: () => void
  /** Bumps every time something is added, for the button's pulse animation. */
  pulse: number
}

const KEY = 'bt_my_list'
const Ctx = createContext<MyList | null>(null)

function read(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((e) => Number.isInteger(e?.id) && e.qty > 0) : []
  } catch {
    return []
  }
}

export function MyListProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>(read)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries))
    } catch {
      /* private mode: list lasts for this visit */
    }
  }, [entries])

  const add = useCallback((id: number) => {
    setEntries((list) => (list.some((e) => e.id === id) ? list.map((e) => (e.id === id ? { ...e, qty: e.qty + 1 } : e)) : [...list, { id, qty: 1 }]))
    setPulse((p) => p + 1)
  }, [])

  const remove = useCallback((id: number) => {
    setEntries((list) => list.flatMap((e) => (e.id !== id ? [e] : e.qty > 1 ? [{ ...e, qty: e.qty - 1 }] : [])))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  const value = useMemo<MyList>(
    () => ({
      entries,
      count: entries.reduce((n, e) => n + e.qty, 0),
      qtyOf: (id) => entries.find((e) => e.id === id)?.qty ?? 0,
      add,
      remove,
      clear,
      pulse,
    }),
    [entries, add, remove, clear, pulse],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMyList(): MyList {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMyList outside MyListProvider')
  return ctx
}
