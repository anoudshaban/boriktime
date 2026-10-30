import { useEffect, useRef, useState, type FormEvent } from 'react'
import { TAG_KEYS, TagIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import type { AdminCategory, AdminProduct, Tag } from '../types'
import { ConfirmButton, Drawer, Field, ImageDrop, Switch, useToast } from './ui'

type Props = {
  product: AdminProduct | null
  open: boolean
  categories: (AdminCategory & { label?: string })[]
  defaultCategory?: number
  currency?: string
  onClose: () => void
  onSaved: (product: AdminProduct, deleted?: boolean) => void
}

type SizeDraft = { en: string; ar: string; price: string }

type Draft = Omit<AdminProduct, 'id' | 'image' | 'sort_order' | 'price' | 'sale_price' | 'sizes' | 'calories' | 'code'> & {
  price: string
  sale_price: string
  sizes: SizeDraft[]
  calories: string
  code: string
}

const TAG_LABELS: Record<Tag, string> = {
  new: 'New',
  popular: 'Popular',
  spicy: 'Spicy',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  sharing: 'For sharing',
  gluten_free: 'Gluten free',
  nuts: 'Contains nuts',
}

function toDraft(p: AdminProduct | null, categoryId?: number): Draft {
  return {
    category_id: p?.category_id ?? categoryId ?? 0,
    code: p?.code != null ? String(p.code) : '',
    name_en: p?.name_en ?? '',
    name_ar: p?.name_ar ?? '',
    description_en: p?.description_en ?? '',
    description_ar: p?.description_ar ?? '',
    price: p ? String(p.price) : '',
    sale_price: p?.sale_price != null ? String(p.sale_price) : '',
    sizes: (p?.sizes ?? []).map((s) => ({ ...s, price: String(s.price) })),
    calories: p?.calories != null ? String(p.calories) : '',
    tags: p?.tags ?? [],
    is_featured: p?.is_featured ?? false,
    is_available: p?.is_available ?? true,
  }
}

export function ProductEditor({ product, open, categories, defaultCategory, currency = 'JD', onClose, onSaved }: Props) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() => toDraft(product, defaultCategory))
  const [image, setImage] = useState<string | null>(product?.image ?? null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(product, defaultCategory))
    setImage(product?.image ?? null)
    setErrors({})
  }, [open, product, defaultCategory])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const err = (key: string) => errors[key]?.[0]

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    setSaving(true)
    setErrors({})
    const body = {
      ...draft,
      code: draft.code === '' ? null : Number(draft.code),
      price: Number(draft.price),
      sale_price: draft.sale_price.trim() === '' ? null : Number(draft.sale_price),
      // With sizes the server sets the price to the smallest one.
      sizes: draft.sizes.map((s) => ({ ...s, price: Number(s.price) })),
      calories: draft.calories === '' ? null : Number(draft.calories),
      description_en: draft.description_en || null,
      description_ar: draft.description_ar || null,
    }
    try {
      const res = await api<{ data: AdminProduct }>(product ? `/admin/products/${product.id}` : '/admin/products', {
        method: product ? 'PUT' : 'POST',
        body,
      })
      onSaved(res.data)
      toast(product ? 'Dish saved' : 'Dish added')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File) => {
    if (!product) return
    setUploading(true)
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/image`, { method: 'POST', body: form })
      setImage(res.data.image)
      onSaved(res.data)
      toast('Photo uploaded')
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async () => {
    if (!product) return
    const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/image`, { method: 'DELETE' })
    setImage(null)
    onSaved(res.data)
  }

  const remove = async () => {
    if (!product) return
    await api(`/admin/products/${product.id}`, { method: 'DELETE' })
    onSaved(product, true)
    toast('Dish deleted')
    onClose()
  }

  const setSize = (i: number, key: keyof SizeDraft, value: string) => set('sizes', draft.sizes.map((s, j) => (j === i ? { ...s, [key]: value } : s)))
  const hasSizes = draft.sizes.length > 0

  const toggleTag = (tag: Tag) => set('tags', draft.tags.includes(tag) ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])

  return (
    <Drawer
      open={open}
      title={product ? `Edit · ${product.name_en}` : 'New dish'}
      onClose={onClose}
      footer={
        <>
          {product && <ConfirmButton onConfirm={remove}>Delete dish</ConfirmButton>}
          <span style={{ flex: 1 }} />
          <button className="a-btn a-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="a-btn a-btn--primary" onClick={() => save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form className="a-form" onSubmit={save}>
        {product ? (
          <>
            <ImageDrop src={image} onFile={upload} onRemove={removeImage} busy={uploading} />
            <VideoField product={product} onSaved={onSaved} />
          </>
        ) : (
          <p className="a-note">Save the dish first, then add its photo.</p>
        )}

        <div className="a-grid-2">
          <Field label="Section" error={err('category_id')}>
            <select value={draft.category_id} onChange={(e) => set('category_id', Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label ?? c.name_en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Menu number" hint="Optional" error={err('code')}>
            <input inputMode="numeric" value={draft.code} onChange={(e) => set('code', e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>

        <div className="a-grid-2">
          <Field label="Name (English)" error={err('name_en')}>
            <input value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} required />
          </Field>
          <Field label="الاسم (عربي)" error={err('name_ar')}>
            <input dir="rtl" lang="ar" value={draft.name_ar} onChange={(e) => set('name_ar', e.target.value)} required />
          </Field>
        </div>

        <Field label="Description (English)" error={err('description_en')}>
          <textarea rows={3} value={draft.description_en ?? ''} onChange={(e) => set('description_en', e.target.value)} />
        </Field>
        <Field label="الوصف (عربي)" error={err('description_ar')}>
          <textarea dir="rtl" lang="ar" rows={3} value={draft.description_ar ?? ''} onChange={(e) => set('description_ar', e.target.value)} />
        </Field>

        {!hasSizes && (
          <div className="a-grid-2">
            <Field label={`Price (${currency})`} error={err('price')}>
              <input inputMode="decimal" value={draft.price} onChange={(e) => set('price', e.target.value.replace(',', '.'))} required />
            </Field>
            <Field label={`Offer price (${currency})`} hint="Optional — the price is then shown crossed out" error={err('sale_price')}>
              <input inputMode="decimal" value={draft.sale_price} onChange={(e) => set('sale_price', e.target.value.replace(',', '.'))} />
            </Field>
          </div>
        )}

        <div className="a-field a-field--wide">
          <span className="a-field__label">Sizes</span>
          <span className="a-muted">
            {hasSizes
              ? 'Each size has its own price. The menu card shows “from” the smallest price.'
              : 'Optional — for dishes sold in sizes, e.g. trays of 12 / 24 / 40 pieces.'}
          </span>
          {draft.sizes.map((size, i) => (
            <div className="a-size" key={i}>
              <input aria-label="Size (English)" placeholder="Small · 12 pcs" value={size.en} onChange={(e) => setSize(i, 'en', e.target.value)} />
              <input aria-label="الحجم (عربي)" placeholder="صغيرة · 12 قطعة" dir="rtl" lang="ar" value={size.ar} onChange={(e) => setSize(i, 'ar', e.target.value)} />
              <input aria-label={`Price (${currency})`} placeholder={currency} inputMode="decimal" value={size.price} onChange={(e) => setSize(i, 'price', e.target.value.replace(',', '.'))} />
              <button type="button" className="a-btn a-btn--ghost a-btn--danger" onClick={() => set('sizes', draft.sizes.filter((_, j) => j !== i))} aria-label="Remove size">
                ✕
              </button>
              {(err(`sizes.${i}.en`) || err(`sizes.${i}.ar`) || err(`sizes.${i}.price`)) && (
                <span className="a-field__error">{err(`sizes.${i}.en`) ?? err(`sizes.${i}.ar`) ?? err(`sizes.${i}.price`)}</span>
              )}
            </div>
          ))}
          <div>
            <button type="button" className="a-btn a-btn--ghost" onClick={() => set('sizes', [...draft.sizes, { en: '', ar: '', price: '' }])}>
              + Add size
            </button>
          </div>
        </div>

        <Field label="Calories" hint="Optional" error={err('calories')}>
          <input inputMode="numeric" value={draft.calories} onChange={(e) => set('calories', e.target.value.replace(/\D/g, ''))} />
        </Field>

        <div className="a-field a-field--wide">
          <span className="a-field__label">Tags</span>
          <div className="a-tags">
            {TAG_KEYS.map((tag) => (
              <button type="button" key={tag} className={`a-tag${draft.tags.includes(tag) ? ' is-on' : ''}`} onClick={() => toggleTag(tag)}>
                <TagIcon tag={tag} size={15} />
                {TAG_LABELS[tag]}
              </button>
            ))}
          </div>
        </div>

        <div className="a-switch-row">
          <Switch checked={draft.is_available} onChange={(v) => set('is_available', v)} label="Visible on menu" />
          <span>Visible on the menu</span>
        </div>
        <div className="a-switch-row">
          <Switch checked={draft.is_featured} onChange={(v) => set('is_featured', v)} label="Chef's pick" />
          <span>Show in “Chef’s picks”</span>
        </div>

        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}

/** Optional moving photo: an animated GIF or short MP4/WebM that loops on the menu. */
function VideoField({ product, onSaved }: { product: AdminProduct; onSaved: (p: AdminProduct) => void }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [video, setVideo] = useState<string | null>(product.video ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setVideo(product.video ?? null), [product])

  const upload = async (file?: File) => {
    if (!file) return
    setBusy(true)
    const form = new FormData()
    form.append('video', file)
    try {
      const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/video`, { method: 'POST', body: form })
      setVideo(res.data.video ?? null)
      onSaved(res.data)
      toast('Moving photo added')
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Upload failed', 'error')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async () => {
    const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/video`, { method: 'DELETE' })
    setVideo(null)
    onSaved(res.data)
  }

  return (
    <div className="a-field a-field--wide">
      <span className="a-field__label">Moving photo (GIF or short video)</span>
      <div className="a-video">
        {video ? (
          /\.gif(\?|$)/i.test(video) ? <img src={video} alt="" /> : <video src={video} autoPlay muted loop playsInline />
        ) : (
          <span className="a-muted">Optional — plays on repeat instead of the photo. GIF, MP4 or WebM, up to 20 MB, 3–8 seconds works best.</span>
        )}
        <div className="a-drop__actions">
          <button type="button" className="a-btn a-btn--ghost" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : video ? 'Replace' : 'Choose GIF / video'}
          </button>
          {video && (
            <button type="button" className="a-btn a-btn--ghost a-btn--danger" onClick={remove}>
              Remove
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/gif,video/mp4,video/webm,video/quicktime" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </div>
    </div>
  )
}
