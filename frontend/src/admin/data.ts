import { api } from '../lib/api'
import type { AdminCategory, AdminProduct, Settings } from '../types'

export type Section = AdminCategory & { label: string }

export type AdminData = {
  /** Every category, groups included. */
  categories: AdminCategory[]
  /** Only categories that hold dishes, labelled "Group › Section". */
  sections: Section[]
  products: AdminProduct[]
  settings: Settings
}

/** Loads what most admin pages need in one round trip. */
export async function loadAdminData(): Promise<AdminData> {
  const [c, p, settings] = await Promise.all([
    api<{ data: AdminCategory[] }>('/admin/categories'),
    api<{ data: AdminProduct[] }>('/admin/products'),
    api<Settings>('/admin/settings'),
  ])

  const names = new Map(c.data.map((x) => [x.id, x.name_en]))
  const parents = new Set(c.data.map((x) => x.parent_id).filter(Boolean))
  const order = (x: AdminCategory) => {
    const parent = x.parent_id ? c.data.find((g) => g.id === x.parent_id) : undefined
    return (parent ? parent.sort_order : x.sort_order) * 1000 + (parent ? x.sort_order + 1 : 0)
  }

  const sections = c.data
    .filter((x) => !parents.has(x.id))
    .sort((a, b) => order(a) - order(b))
    .map((x) => ({ ...x, label: x.parent_id ? `${names.get(x.parent_id)} › ${x.name_en}` : x.name_en }))

  return { categories: c.data, sections, products: p.data, settings }
}
