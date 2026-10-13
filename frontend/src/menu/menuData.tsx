import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Category, Group, Menu, Offer, Product, Settings } from '../types'

export type DishRef = { product: Product; section: Category; group: Group }

type MenuData = {
  groups: Group[]
  offers: Offer[]
  settings: Settings | null
  /** Every visible dish by id, with where it lives. */
  dishes: Map<number, DishRef>
  /** Offers that include a given dish. */
  offersFor: (productId: number) => Offer[]
}

const Ctx = createContext<MenuData | null>(null)

export function MenuDataProvider({ menu, children }: { menu: Menu | null; children: ReactNode }) {
  const value = useMemo<MenuData>(() => {
    const groups = menu?.groups ?? []
    const offers = menu?.offers ?? []
    const dishes = new Map<number, DishRef>()
    for (const group of groups)
      for (const section of group.sections) for (const product of section.products) dishes.set(product.id, { product, section, group })

    return {
      groups,
      offers,
      settings: menu?.settings ?? null,
      dishes,
      offersFor: (id) => offers.filter((o) => o.product_ids.includes(id)),
    }
  }, [menu])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMenuData(): MenuData {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMenuData outside MenuDataProvider')
  return ctx
}

/** Path to a dish's quick view. */
export const dishPath = (ref: DishRef) => `/menu/${ref.group.slug}/${ref.product.id}`
