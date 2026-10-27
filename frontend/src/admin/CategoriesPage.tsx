import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { CATEGORY_ICON_KEYS, CategoryIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import type { AdminCategory } from '../types'
import { ConfirmButton, Drawer, Field, ImageDrop, Switch, useToast } from './ui'

type Draft = Pick<AdminCategory, 'parent_id' | 'name_en' | 'name_ar' | 'description_en' | 'description_ar' | 'icon' | 'is_active'>

const empty: Draft = { parent_id: null, name_en: '', name_ar: '', description_en: '', description_ar: '', icon: 'dish', is_active: true }

const bySort = (a: AdminCategory, b: AdminCategory) => a.sort_order - b.sort_order || a.id - b.id

/**
 * Groups (cards on the menu home) with their sections (tabs on the group page).
 * Order within each level is the order guests see.
 */
export function CategoriesPage() {
  const toast = useToast()
  const [items, setItems] = useState<AdminCategory[]>([])
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null)
  const [newParent, setNewParent] = useState<number | null>(null)

  const load = useCallback(async () => {
    const res = await api<{ data: AdminCategory[] }>('/admin/categories')
    setItems(res.data)
  }, [])

  useEffect(() => {
    load().catch(() => toast('Could not load sections', 'error'))
  }, [load, toast])

  const tops = useMemo(() => items.filter((c) => c.parent_id === null).sort(bySort), [items])
  const childrenOf = useCallback((id: number) => items.filter((c) => c.parent_id === id).sort(bySort), [items])

  const move = async (siblings: AdminCategory[], index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= siblings.length) return
    const next = [...siblings]
    ;[next[index], next[target]] = [next[target], next[index]]
    const order = new Map(next.map((c, i) => [c.id, i]))
    setItems((all) => all.map((c) => (order.has(c.id) ? { ...c, sort_order: order.get(c.id)! } : c)))
    await api('/admin/categories/reorder', { method: 'POST', body: { ids: next.map((c) => c.id) } }).catch(() => toast('Reorder failed', 'error'))
  }

  const toggle = async (category: AdminCategory, is_active: boolean) => {
    setItems((list) => list.map((c) => (c.id === category.id ? { ...c, is_active } : c)))
    await api(`/admin/categories/${category.id}`, { method: 'PUT', body: { is_active } }).catch(() => toast('Save failed', 'error'))
  }

  const row = (c: AdminCategory, siblings: AdminCategory[], i: number, nested: boolean) => (
    <motion.li key={c.id} layout className={`a-item a-item--cat${nested ? ' a-item--nested' : ''}${c.is_active ? '' : ' is-off'}`} exit={{ opacity: 0 }}>
      <div className="a-item__order">
        <button onClick={() => move(siblings, i, -1)} disabled={i === 0} aria-label="Move up">
          ▲
        </button>
        <button onClick={() => move(siblings, i, 1)} disabled={i === siblings.length - 1} aria-label="Move down">
          ▼
        </button>
      </div>
      <span className="a-item__thumb">
        <CategoryIcon name={c.icon} size={24} />
      </span>
      <button className="a-item__names" onClick={() => setEditing(c)}>
        <span className="a-item__en">{c.name_en}</span>
        <span className="a-item__ar" lang="ar" dir="rtl">
          {c.name_ar}
        </span>
      </button>
      <span className="a-pill">{nested || !childrenOf(c.id).length ? `${c.products_count ?? 0} dishes` : `${childrenOf(c.id).length} sections`}</span>
      <div className="a-item__toggles">
        <label>
          <Switch checked={c.is_active} onChange={(v) => toggle(c, v)} label="Visible" />
          <span>Visible</span>
        </label>
      </div>
    </motion.li>
  )

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Sections</h1>
          <p className="a-muted">Groups are the large cards on the menu home; their sections are the tabs inside. Order here = order on the menu.</p>
        </div>
        <button
          className="a-btn a-btn--primary"
          onClick={() => {
            setNewParent(tops[0]?.id ?? null)
            setEditing('new')
          }}
        >
          + Add section
        </button>
      </header>

      {tops.map((group, gi) => (
        <section key={group.id} className="a-group">
          <ul className="a-list">
            <AnimatePresence initial={false}>
              {row(group, tops, gi, false)}
              {childrenOf(group.id).map((c, i, siblings) => row(c, siblings, i, true))}
            </AnimatePresence>
          </ul>
        </section>
      ))}

      <CategoryEditor
        category={editing === 'new' ? null : editing}
        defaultParent={newParent}
        groups={tops}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={(saved, deleted) =>
          setItems((list) => {
            if (deleted) return list.filter((c) => c.id !== saved.id).map((c) => (c.parent_id === saved.id ? { ...c, parent_id: null } : c))
            return list.some((c) => c.id === saved.id) ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved]
          })
        }
      />
    </div>
  )
}

function CategoryEditor({
  category,
  defaultParent,
  groups,
  open,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null
  defaultParent: number | null
  groups: AdminCategory[]
  open: boolean
  onClose: () => void
  onSaved: (c: AdminCategory, deleted?: boolean) => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(empty)
  const [image, setImage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(
      category
        ? { ...category, description_en: category.description_en ?? '', description_ar: category.description_ar ?? '' }
        : { ...empty, parent_id: defaultParent },
    )
    setImage(category?.image ?? null)
    setErrors({})
  }, [open, category, defaultParent])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const isGroupWithSections = Boolean(category && category.parent_id === null && groups.some((g) => g.id === category.id) && !category.products_count)
  const parentOptions = groups.filter((g) => g.id !== category?.id)

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    try {
      const body = {
        parent_id: draft.parent_id,
        name_en: draft.name_en,
        name_ar: draft.name_ar,
        icon: draft.icon,
        is_active: draft.is_active,
        description_en: draft.description_en || null,
        description_ar: draft.description_ar || null,
      }
      const res = await api<{ data: AdminCategory }>(category ? `/admin/categories/${category.id}` : '/admin/categories', {
        method: category ? 'PUT' : 'POST',
        body,
      })
      onSaved(res.data)
      toast('Saved')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file: File) => {
    if (!category) return
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await api<{ data: AdminCategory }>(`/admin/categories/${category.id}/image`, { method: 'POST', body: form })
      setImage(res.data.image)
      onSaved(res.data)
      toast('Photo uploaded')
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Upload failed', 'error')
    }
  }

  const removeImage = async () => {
    if (!category) return
    const res = await api<{ data: AdminCategory }>(`/admin/categories/${category.id}/image`, { method: 'DELETE' })
    setImage(null)
    onSaved(res.data)
  }

  const remove = async () => {
    if (!category) return
    await api(`/admin/categories/${category.id}`, { method: 'DELETE' })
    onSaved(category, true)
    toast('Deleted')
    onClose()
  }

  return (
    <Drawer
      open={open}
      title={category ? `Edit · ${category.name_en}` : 'New section'}
      onClose={onClose}
      footer={
        <>
          {category && <ConfirmButton onConfirm={remove}>Delete & its dishes</ConfirmButton>}
          <span style={{ flex: 1 }} />
          <button className="a-btn a-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="a-btn a-btn--primary" onClick={() => save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form className="a-form" onSubmit={save}>
        <Field
          label="Group"
          hint={isGroupWithSections ? 'This is a group shown on the menu home.' : 'Which home card this section belongs to'}
          error={errors.parent_id?.[0]}
        >
          <select value={draft.parent_id ?? ''} onChange={(e) => set('parent_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">— None (show as its own card on the home page) —</option>
            {parentOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name_en}
              </option>
            ))}
          </select>
        </Field>

        <div className="a-grid-2">
          <Field label="Name (English)" error={errors.name_en?.[0] ?? errors.slug?.[0]}>
            <input value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} required />
          </Field>
          <Field label="الاسم (عربي)" error={errors.name_ar?.[0]}>
            <input dir="rtl" lang="ar" value={draft.name_ar} onChange={(e) => set('name_ar', e.target.value)} required />
          </Field>
        </div>
        <Field label="Short description (English)" hint="Shown under the title">
          <input value={draft.description_en ?? ''} onChange={(e) => set('description_en', e.target.value)} />
        </Field>
        <Field label="الوصف (عربي)">
          <input dir="rtl" lang="ar" value={draft.description_ar ?? ''} onChange={(e) => set('description_ar', e.target.value)} />
        </Field>

        <div className="a-field a-field--wide">
          <span className="a-field__label">Icon</span>
          <div className="a-icons">
            {CATEGORY_ICON_KEYS.map((key) => (
              <button type="button" key={key} className={`a-icon-pick${draft.icon === key ? ' is-on' : ''}`} onClick={() => set('icon', key)} title={key}>
                <CategoryIcon name={key} size={26} />
              </button>
            ))}
          </div>
        </div>

        <div className="a-switch-row">
          <Switch checked={draft.is_active} onChange={(v) => set('is_active', v)} label="Visible" />
          <span>Visible on the menu</span>
        </div>

        {category && (
          <div className="a-field a-field--wide">
            <span className="a-field__label">Cover photo (optional)</span>
            <ImageDrop src={image} onFile={upload} onRemove={removeImage} />
          </div>
        )}
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
