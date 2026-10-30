import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CategoryIcon, SearchIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import { normalize } from '../lib/text'
import type { AdminCategory, AdminProduct } from '../types'
import { loadAdminData } from './data'
import { DeliverySettings } from './DeliverySettings'
import { ProductEditor } from './ProductEditor'
import { Switch, useToast } from './ui'

export function ProductsPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<(AdminCategory & { label: string })[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('JD')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)

  const load = useCallback(async () => {
    const data = await loadAdminData()
    setCategories(data.sections)
    setProducts(data.products)
    setCurrency(data.settings.currency_en || 'JD')
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch(() => toast('Could not load dishes', 'error'))
  }, [load, toast])

  const patch = async (product: AdminProduct, changes: Partial<AdminProduct>, message?: string) => {
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, ...changes } : p)))
    try {
      const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}`, { method: 'PUT', body: changes })
      setProducts((list) => list.map((p) => (p.id === product.id ? res.data : p)))
      if (message) toast(message)
    } catch (err) {
      setProducts((list) => list.map((p) => (p.id === product.id ? product : p)))
      toast(err instanceof ApiError ? err.firstError : 'Save failed', 'error')
    }
  }

  /** Delivery, pick-up or Chef's pick on/off for every dish in a section at once. */
  const setSection = async (category: AdminCategory, field: 'is_delivery' | 'is_pickup' | 'is_featured', on: boolean) => {
    const before = products
    setProducts((list) => list.map((p) => (p.category_id === category.id ? { ...p, [field]: on } : p)))
    try {
      await api('/admin/products/bulk', { method: 'POST', body: { category_id: category.id, field, on } })
      const what = field === 'is_delivery' ? 'delivery' : field === 'is_pickup' ? 'pick-up' : "Chef's picks"
      toast(`${category.name_en}: ${what} ${on ? 'on for all dishes' : 'off'}`)
    } catch (err) {
      setProducts(before)
      toast(err instanceof ApiError ? err.firstError : 'Save failed', 'error')
    }
  }

  const move = async (category: AdminCategory, index: number, delta: number) => {
    const list = products.filter((p) => p.category_id === category.id)
    const target = index + delta
    if (target < 0 || target >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const order = new Map(reordered.map((p, i) => [p.id, i]))
    setProducts((all) => all.map((p) => (order.has(p.id) ? { ...p, sort_order: order.get(p.id)! } : p)).sort((a, b) => a.category_id - b.category_id || a.sort_order - b.sort_order))
    await api('/admin/products/reorder', { method: 'POST', body: { ids: reordered.map((p) => p.id) } }).catch(() => toast('Reorder failed', 'error'))
  }

  const groups = useMemo(() => {
    const q = normalize(query)
    return categories
      .filter((c) => filter === 'all' || c.id === filter)
      .map((category) => ({
        category,
        items: products.filter(
          (p) => p.category_id === category.id && (!q || normalize(`${p.name_en} ${p.name_ar} ${p.code ?? ''}`).includes(q)),
        ),
      }))
      .filter((g) => g.items.length || (!q && filter !== 'all'))
  }, [categories, products, query, filter])

  const stats = useMemo(
    () => ({
      total: products.length,
      hidden: products.filter((p) => !p.is_available).length,
      photos: products.filter((p) => p.image).length,
      featured: products.filter((p) => p.is_featured).length,
      delivery: products.filter((p) => p.is_delivery).length,
      pickup: products.filter((p) => p.is_pickup).length,
    }),
    [products],
  )

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Dishes</h1>
          <p className="a-muted">Edit names, prices and photos. Changes appear on the live menu immediately.</p>
        </div>
        <button className="a-btn a-btn--primary" onClick={() => setEditing('new')} disabled={!categories.length}>
          + Add dish
        </button>
      </header>

      <div className="a-stats">
        {[
          ['Dishes', stats.total],
          ['Hidden', stats.hidden],
          ['With photo', stats.photos],
          ["Chef's picks", stats.featured],
          ['Delivery', stats.delivery],
          ['Pick-up', stats.pickup],
        ].map(([label, value], i) => (
          <motion.div key={label} className="a-stat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="a-stat__value">{value}</span>
            <span className="a-stat__label">{label}</span>
          </motion.div>
        ))}
      </div>

      {!loading && <DeliverySettings currency={currency} />}

      <div className="a-toolbar">
        <label className="a-search">
          <SearchIcon size={18} />
          <input placeholder="Search by name or number…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All sections</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="a-skeleton" />}

      {groups.map(({ category, items }) => (
        <section key={category.id} className="a-group">
          <h2 className="a-group__title">
            <CategoryIcon name={category.icon} size={20} />
            {category.label}
            <span className="a-muted" lang="ar">
              {category.name_ar}
            </span>
            {!category.is_active && <span className="a-pill a-pill--muted">Section hidden</span>}
            <span className="a-group__actions">
              <span className="a-group__pair">
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_delivery', true)}>
                  Delivery: all on
                </button>
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_delivery', false)}>
                  all off
                </button>
              </span>
              <span className="a-group__pair">
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_pickup', true)}>
                  Pick-up: all on
                </button>
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_pickup', false)}>
                  all off
                </button>
              </span>
              <span className="a-group__pair">
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_featured', true)}>
                  ★ Chef’s pick: all on
                </button>
                <button className="a-btn a-btn--ghost a-btn--sm" onClick={() => setSection(category, 'is_featured', false)}>
                  all off
                </button>
              </span>
            </span>
          </h2>

          <ul className="a-list">
            <AnimatePresence initial={false}>
              {items.map((p, i) => (
                <motion.li key={p.id} layout className={`a-item${p.is_available ? '' : ' is-off'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}>
                  <div className="a-item__order">
                    <button onClick={() => move(category, i, -1)} disabled={i === 0 || Boolean(query)} aria-label="Move up">
                      ▲
                    </button>
                    <button onClick={() => move(category, i, 1)} disabled={i === items.length - 1 || Boolean(query)} aria-label="Move down">
                      ▼
                    </button>
                  </div>

                  <button className="a-item__thumb" onClick={() => setEditing(p)} aria-label={`Edit ${p.name_en}`}>
                    {p.image ? <img src={p.image} alt="" /> : <CategoryIcon name={category.icon} size={22} />}
                  </button>

                  <button className="a-item__names" onClick={() => setEditing(p)}>
                    <span className="a-item__en">
                      {p.code != null && <span className="a-item__code">{p.code}</span>}
                      {p.name_en}
                    </span>
                    <span className="a-item__ar" lang="ar" dir="rtl">
                      {p.name_ar}
                    </span>
                  </button>

                  {p.sizes?.length ? (
                    <button className="a-item__sizes" onClick={() => setEditing(p)} title="Edit the sizes in the dish">
                      {p.sizes.map((s) => s.price).join(' / ')} {currency}
                    </button>
                  ) : (
                    <PriceInput value={p.price} currency={currency} onSave={(price) => patch(p, { price }, `${p.name_en}: price updated`)} />
                  )}

                  <div className="a-item__toggles">
                    <label title="Visible on the menu">
                      <Switch checked={p.is_available} label="Available" onChange={(v) => patch(p, { is_available: v }, v ? 'Dish is visible' : 'Dish hidden')} />
                      <span>Visible</span>
                    </label>
                    <label title="Can be ordered for delivery">
                      <Switch checked={p.is_delivery} label="Delivery" onChange={(v) => patch(p, { is_delivery: v }, v ? 'Available for delivery' : 'Not for delivery')} />
                      <span>Delivery</span>
                    </label>
                    <label title="Can be ordered for pick-up at the restaurant">
                      <Switch checked={p.is_pickup} label="Pick-up" onChange={(v) => patch(p, { is_pickup: v }, v ? 'Available for pick-up' : 'Not for pick-up')} />
                      <span>Pick-up</span>
                    </label>
                    <label title="Chef's pick: shown in the Chef's picks row on the menu home">
                      <Switch checked={p.is_featured} label="Chef's pick" onChange={(v) => patch(p, { is_featured: v })} />
                      <span>★ Chef’s pick</span>
                    </label>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}

      <ProductEditor
        product={editing === 'new' ? null : editing}
        open={editing !== null}
        categories={categories}
        currency={currency}
        defaultCategory={filter === 'all' ? categories[0]?.id : filter}
        onClose={() => setEditing(null)}
        onSaved={(saved, deleted) => {
          setProducts((list) => {
            if (deleted) return list.filter((p) => p.id !== saved.id)
            const exists = list.some((p) => p.id === saved.id)
            return exists ? list.map((p) => (p.id === saved.id ? saved : p)) : [...list, saved]
          })
        }}
      />
    </div>
  )
}

/** Price that saves itself on blur / Enter. */
function PriceInput({ value, currency, onSave }: { value: number; currency: string; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    const next = Number(draft)
    if (draft.trim() === '' || Number.isNaN(next) || next < 0) return setDraft(String(value))
    if (next !== value) onSave(next)
  }

  return (
    <label className="a-price">
      <input
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(',', '.'))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        aria-label="Price"
      />
      <span>{currency}</span>
    </label>
  )
}
