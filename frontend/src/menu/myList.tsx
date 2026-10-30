import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * "My list": guests collect dishes while browsing and show the list to the
 * waiter. Saved on the phone only — there is no online ordering.
 */
/** `size` is the chosen size (index into product.sizes) for dishes that come in sizes. */
type Entry = { id: number; qty: number; size?: number }

const same = (e: Entry, id: number, size?: number) => e.id === id && (e.size ?? null) === (size ?? null)

type MyList = {
  entries: Entry[]
  count: number
  qtyOf: (id: number, size?: number) => number
  add: (id: number, size?: number) => void
  remove: (id: number, size?: number) => void
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

  const add = useCallback((id: number, size?: number) => {
    setEntries((list) =>
      list.some((e) => same(e, id, size)) ? list.map((e) => (same(e, id, size) ? { ...e, qty: e.qty + 1 } : e)) : [...list, size == null ? { id, qty: 1 } : { id, qty: 1, size }],
    )
    setPulse((p) => p + 1)
  }, [])

  const remove = useCallback((id: number, size?: number) => {
    setEntries((list) => list.flatMap((e) => (!same(e, id, size) ? [e] : e.qty > 1 ? [{ ...e, qty: e.qty - 1 }] : [])))
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  const value = useMemo<MyList>(
    () => ({
      entries,
      count: entries.reduce((n, e) => n + e.qty, 0),
      qtyOf: (id, size) => entries.find((e) => same(e, id, size))?.qty ?? 0,
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
