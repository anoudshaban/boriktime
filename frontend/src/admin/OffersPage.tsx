import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { normalize } from '../lib/text'
import type { AdminOffer, AdminProduct } from '../types'
import { loadAdminData, type Section } from './data'
import { ConfirmButton, Drawer, Field, ImageDrop, Switch, useToast } from './ui'

type Draft = {
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  badge_en: string
  badge_ar: string
  price: string
  old_price: string
  starts_at: string
  ends_at: string
  is_active: boolean
  product_ids: number[]
}

const empty: Draft = {
  title_en: '',
  title_ar: '',
  description_en: '',
  description_ar: '',
  badge_en: '',
  badge_ar: '',
  price: '',
  old_price: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
  product_ids: [],
}

const toDraft = (o: AdminOffer | null): Draft =>
  o
    ? {
        title_en: o.title_en,
        title_ar: o.title_ar,
        description_en: o.description_en ?? '',
        description_ar: o.description_ar ?? '',
        badge_en: o.badge_en ?? '',
        badge_ar: o.badge_ar ?? '',
        price: o.price != null ? String(o.price) : '',
        old_price: o.old_price != null ? String(o.old_price) : '',
        starts_at: o.starts_at ?? '',
        ends_at: o.ends_at ?? '',
        is_active: o.is_active,
        product_ids: o.product_ids ?? [],
      }
    : empty

function status(o: AdminOffer): { label: string; tone: string } {
  if (!o.is_active) return { label: 'Off', tone: 'muted' }
  if (o.is_running) return { label: 'Live now', tone: 'live' }
  if (o.starts_at && new Date(o.starts_at) > new Date()) return { label: `Starts ${o.starts_at}`, tone: 'soon' }
  return { label: 'Ended', tone: 'muted' }
}

export function OffersPage() {
  const toast = useToast()
  const [offers, setOffers] = useState<AdminOffer[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [currency, setCurrency] = useState('JD')
  const [editing, setEditing] = useState<AdminOffer | 'new' | null>(null)

  useEffect(() => {
    Promise.all([api<{ data: AdminOffer[] }>('/admin/offers'), loadAdminData()])
      .then(([o, d]) => {
        setOffers(o.data)
        setProducts(d.products)
        setSections(d.sections)
        setCurrency(d.settings.currency_en || 'JD')
      })
      .catch(() => toast('Could not load offers', 'error'))
  }, [toast])

  const move = async (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= offers.length) return
    const next = [...offers]
    ;[next[index], next[target]] = [next[target], next[index]]
    setOffers(next)
    await api('/admin/offers/reorder', { method: 'POST', body: { ids: next.map((o) => o.id) } }).catch(() => toast('Reorder failed', 'error'))
  }

  const toggle = async (offer: AdminOffer, is_active: boolean) => {
    const res = await api<{ data: AdminOffer }>(`/admin/offers/${offer.id}`, { method: 'PUT', body: { is_active } })
    setOffers((list) => list.map((o) => (o.id === offer.id ? res.data : o)))
  }

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Offers</h1>
          <p className="a-muted">Promotions shown in a slider at the top of the menu. Set dates and they appear and disappear on their own.</p>
        </div>
        <button className="a-btn a-btn--primary" onClick={() => setEditing('new')}>
          + New offer
        </button>
      </header>

      {offers.length === 0 && (
        <div className="a-card a-empty">
          <p>No offers yet.</p>
          <p className="a-muted">Ideas: a weekend breakfast price, “Börek + Turkish tea”, a new dessert launch, Ramadan or holiday specials.</p>
          <p className="a-muted">
            Tip: for a single dish you can also set an <strong>offer price</strong> directly on the dish (Dishes &amp; prices → edit).
          </p>
        </div>
      )}

      <ul className="a-list">
        <AnimatePresence initial={false}>
          {offers.map((o, i) => {
            const st = status(o)
            return (
              <motion.li key={o.id} layout className={`a-item a-item--cat${o.is_active ? '' : ' is-off'}`} exit={{ opacity: 0 }}>
                <div className="a-item__order">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    ▲
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === offers.length - 1} aria-label="Move down">
                    ▼
                  </button>
                </div>
                <button className="a-item__thumb a-item__thumb--wide" onClick={() => setEditing(o)}>
                  {o.image ? <img src={o.image} alt="" /> : <span>%</span>}
                </button>
                <button className="a-item__names" onClick={() => setEditing(o)}>
                  <span className="a-item__en">{o.title_en}</span>
                  <span className="a-item__ar" lang="ar" dir="rtl">
                    {o.title_ar}
                  </span>
                </button>
                <span className={`a-pill a-pill--${st.tone}`}>{st.label}</span>
                <div className="a-item__toggles">
                  <label>
                    <Switch checked={o.is_active} onChange={(v) => toggle(o, v)} label="Active" />
                    <span>Active</span>
                  </label>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <OfferEditor
        offer={editing === 'new' ? null : editing}
        open={editing !== null}
        products={products}
        sections={sections}
        currency={currency}
        onClose={() => setEditing(null)}
        onSaved={(saved, deleted) =>
          setOffers((list) => {
            if (deleted) return list.filter((o) => o.id !== saved.id)
            return list.some((o) => o.id === saved.id) ? list.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...list]
          })
        }
      />
    </div>
  )
}

function OfferEditor({
  offer,
  open,
  products,
  sections,
  currency,
  onClose,
  onSaved,
}: {
  offer: AdminOffer | null
  open: boolean
  products: AdminProduct[]
  sections: Section[]
  currency: string
  onClose: () => void
  onSaved: (o: AdminOffer, deleted?: boolean) => void
}) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(empty)
  const [image, setImage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(offer))
    setImage(offer?.image ?? null)
    setPendingImage(null)
    setErrors({})
    setQuery('')
  }, [open, offer])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const err = (k: string) => errors[k]?.[0]

  const sectionName = useMemo(() => new Map(sections.map((s) => [s.id, s.name_en])), [sections])
  const matches = useMemo(() => {
    const q = normalize(query)
    return products.filter((p) => !q || normalize(`${p.name_en} ${p.name_ar} ${p.code ?? ''}`).includes(q))
  }, [products, query])

  const toggleDish = (id: number) =>
    set('product_ids', draft.product_ids.includes(id) ? draft.product_ids.filter((x) => x !== id) : [...draft.product_ids, id])

  const uploadTo = async (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    const res = await api<{ data: AdminOffer }>(`/admin/offers/${id}/image`, { method: 'POST', body: form })
    return res.data
  }

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setErrors({})
    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    const body = {
      ...draft,
      price: num(draft.price),
      old_price: num(draft.old_price),
      starts_at: draft.starts_at || null,
      ends_at: draft.ends_at || null,
      description_en: draft.description_en || null,
      description_ar: draft.description_ar || null,
      badge_en: draft.badge_en || null,
      badge_ar: draft.badge_ar || null,
    }
    try {
      let res = (await api<{ data: AdminOffer }>(offer ? `/admin/offers/${offer.id}` : '/admin/offers', { method: offer ? 'PUT' : 'POST', body })).data
      // New offers get their photo right after they exist.
      if (pendingImage) res = await uploadTo(res.id, pendingImage)
      onSaved(res)
      toast(offer ? 'Offer saved' : 'Offer created')
      onClose()
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File) => {
    if (!offer) {
      setPendingImage(file)
      setImage(URL.createObjectURL(file))
      return
    }
    setUploading(true)
    try {
      const res = await uploadTo(offer.id, file)
      setImage(res.image)
      onSaved(res)
      toast('Photo uploaded')
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async () => {
    if (!offer) {
      setPendingImage(null)
      setImage(null)
      return
    }
    const res = await api<{ data: AdminOffer }>(`/admin/offers/${offer.id}/image`, { method: 'DELETE' })
    setImage(null)
    onSaved(res.data)
  }

  const remove = async () => {
    if (!offer) return
    await api(`/admin/offers/${offer.id}`, { method: 'DELETE' })
    onSaved(offer, true)
    toast('Offer deleted')
    onClose()
  }

  return (
    <Drawer
      open={open}
      title={offer ? `Edit · ${offer.title_en}` : 'New offer'}
      onClose={onClose}
      footer={
        <>
          {offer && <ConfirmButton onConfirm={remove}>Delete offer</ConfirmButton>}
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
        <div className="a-field a-field--wide">
          <span className="a-field__label">Photo (wide images look best, e.g. 1600 × 900)</span>
          <ImageDrop src={image} onFile={onFile} onRemove={removeImage} busy={uploading} />
        </div>

        <div className="a-grid-2">
          <Field label="Title (English)" error={err('title_en')}>
            <input value={draft.title_en} onChange={(e) => set('title_en', e.target.value)} required placeholder="Weekend Breakfast" />
          </Field>
          <Field label="العنوان (عربي)" error={err('title_ar')}>
            <input dir="rtl" lang="ar" value={draft.title_ar} onChange={(e) => set('title_ar', e.target.value)} required placeholder="فطور نهاية الأسبوع" />
          </Field>
        </div>

        <div className="a-grid-2">
          <Field label="Description (English)" error={err('description_en')}>
            <textarea rows={3} value={draft.description_en} onChange={(e) => set('description_en', e.target.value)} />
          </Field>
          <Field label="الوصف (عربي)" error={err('description_ar')}>
            <textarea dir="rtl" lang="ar" rows={3} value={draft.description_ar} onChange={(e) => set('description_ar', e.target.value)} />
          </Field>
        </div>

        <div className="a-grid-2">
          <Field label="Badge (English)" hint="Short label on the image, e.g. Weekend, New, -20%" error={err('badge_en')}>
            <input value={draft.badge_en} onChange={(e) => set('badge_en', e.target.value)} maxLength={40} />
          </Field>
          <Field label="الشارة (عربي)" error={err('badge_ar')}>
            <input dir="rtl" lang="ar" value={draft.badge_ar} onChange={(e) => set('badge_ar', e.target.value)} maxLength={40} />
          </Field>
        </div>

        <div className="a-grid-2">
          <Field label={`Offer price (${currency})`} hint="Optional" error={err('price')}>
            <input inputMode="decimal" value={draft.price} onChange={(e) => set('price', e.target.value.replace(',', '.'))} />
          </Field>
          <Field label={`Was (${currency})`} hint="Optional — shown crossed out" error={err('old_price')}>
            <input inputMode="decimal" value={draft.old_price} onChange={(e) => set('old_price', e.target.value.replace(',', '.'))} />
          </Field>
        </div>

        <div className="a-grid-2">
          <Field label="Starts" hint="Empty = from now" error={err('starts_at')}>
            <input type="date" value={draft.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
          </Field>
          <Field label="Ends (last day)" hint="Empty = until you turn it off" error={err('ends_at')}>
            <input type="date" value={draft.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
          </Field>
        </div>

        <div className="a-switch-row">
          <Switch checked={draft.is_active} onChange={(v) => set('is_active', v)} label="Active" />
          <span>Active</span>
        </div>

        <div className="a-field a-field--wide">
          <span className="a-field__label">Dishes in this offer ({draft.product_ids.length} selected)</span>
          <input className="a-input" placeholder="Search dishes…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="a-pick">
            {matches.map((p) => (
              <label key={p.id} className={draft.product_ids.includes(p.id) ? 'is-on' : ''}>
                <input type="checkbox" checked={draft.product_ids.includes(p.id)} onChange={() => toggleDish(p.id)} />
                <span className="a-pick__name">{p.name_en}</span>
                <span className="a-muted">{sectionName.get(p.category_id)}</span>
              </label>
            ))}
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
