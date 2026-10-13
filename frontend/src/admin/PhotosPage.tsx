import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CategoryIcon } from '../components/icons'
import { api, ApiError } from '../lib/api'
import { normalize } from '../lib/text'
import type { AdminCategory, AdminProduct } from '../types'
import { loadAdminData, type Section } from './data'
import { useToast } from './ui'

/** File name → comparable key: "Iskandar_Kebab (1).JPG" → "iskandar kebab". */
const fileKey = (name: string) =>
  normalize(
    name
      .replace(/\.[^.]+$/, '')
      .replace(/\(\d+\)$/, '')
      .replace(/[_-]+/g, ' '),
  )

export function PhotosPage() {
  const toast = useToast()
  const [sections, setSections] = useState<Section[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [missingOnly, setMissingOnly] = useState(false)
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [bulk, setBulk] = useState<{ done: number; total: number; unmatched: string[] } | null>(null)
  const bulkInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAdminData()
      .then((d) => {
        setSections(d.sections)
        setCategories(d.categories)
        setProducts(d.products)
      })
      .catch(() => toast('Could not load dishes', 'error'))
  }, [toast])

  const setBusyFor = (id: number, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const upload = async (product: AdminProduct, file: File, quiet = false) => {
    setBusyFor(product.id, true)
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/image`, { method: 'POST', body: form })
      setProducts((list) => list.map((p) => (p.id === product.id ? res.data : p)))
      if (!quiet) toast(`Photo added: ${product.name_en}`)
      return true
    } catch (error) {
      toast(error instanceof ApiError ? `${product.name_en}: ${error.firstError}` : 'Upload failed', 'error')
      return false
    } finally {
      setBusyFor(product.id, false)
    }
  }

  const uploadCover = async (category: AdminCategory, file: File) => {
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await api<{ data: AdminCategory }>(`/admin/categories/${category.id}/image`, { method: 'POST', body: form })
      setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, image: res.data.image } : c)))
      toast(`Banner added: ${category.name_en}`)
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Upload failed', 'error')
    }
  }

  const removeCover = async (category: AdminCategory) => {
    await api(`/admin/categories/${category.id}/image`, { method: 'DELETE' })
    setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, image: null } : c)))
  }

  const remove = async (product: AdminProduct) => {
    const res = await api<{ data: AdminProduct }>(`/admin/products/${product.id}/image`, { method: 'DELETE' })
    setProducts((list) => list.map((p) => (p.id === product.id ? res.data : p)))
    toast('Photo removed')
  }

  /** Match many files to dishes by English name, Arabic name or menu number. */
  const uploadMany = async (files: FileList | null) => {
    if (!files?.length) return
    const byKey = new Map<string, AdminProduct>()
    for (const p of products) {
      byKey.set(normalize(p.name_en), p)
      byKey.set(normalize(p.name_ar), p)
      if (p.code != null) byKey.set(String(p.code), p)
    }

    const images = [...files].filter((f) => f.type.startsWith('image/'))
    const unmatched: string[] = []
    setBulk({ done: 0, total: images.length, unmatched })

    for (const file of images) {
      const product = byKey.get(fileKey(file.name))
      if (product) await upload(product, file, true)
      else unmatched.push(file.name)
      setBulk((b) => (b ? { ...b, done: b.done + 1, unmatched: [...unmatched] } : b))
    }

    toast(`${images.length - unmatched.length} photos added${unmatched.length ? `, ${unmatched.length} not matched` : ''}`, unmatched.length ? 'error' : 'ok')
    if (bulkInput.current) bulkInput.current.value = ''
  }

  const groups = useMemo(
    () =>
      sections
        .map((section) => ({
          section,
          items: products.filter((p) => p.category_id === section.id && (!missingOnly || !p.image)),
        }))
        .filter((g) => g.items.length),
    [sections, products, missingOnly],
  )

  const missing = products.filter((p) => !p.image).length

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Food photos</h1>
          <p className="a-muted">
            Click a dish or drop a photo onto it. Photos are resized automatically. {missing} of {products.length} dishes still need a photo.
          </p>
        </div>
        <button className="a-btn a-btn--primary" onClick={() => bulkInput.current?.click()}>
          Upload many photos…
        </button>
        <input ref={bulkInput} type="file" accept="image/*" multiple hidden onChange={(e) => uploadMany(e.target.files)} />
      </header>

      <div className="a-note">
        <strong>Uploading many at once:</strong> name each file after the dish (for example <code>Iskandar Kebab.jpg</code>, the Arabic name, or the menu number like{' '}
        <code>47.jpg</code>) and select them all with “Upload many photos”.
      </div>

      {bulk && (
        <div className="a-card">
          <p className="a-progress__label">
            Uploaded {bulk.done} / {bulk.total}
          </p>
          <div className="a-progress">
            <motion.span animate={{ width: `${bulk.total ? (bulk.done / bulk.total) * 100 : 0}%` }} />
          </div>
          {bulk.unmatched.length > 0 && (
            <p className="a-muted">
              Not matched to a dish (rename the file and try again): <strong>{bulk.unmatched.join(', ')}</strong>
            </p>
          )}
        </div>
      )}

      <section className="a-group">
        <h2 className="a-group__title">Section banners</h2>
        <p className="a-muted">
          Wide photos shown at the top of each section on the menu, with a slow zoom and scroll effect. Group photos (The Kitchen…) appear on the home cards. Landscape
          images work best (e.g. 1600 × 900).
        </p>
        <div className="a-photos a-photos--wide">
          {categories
            .slice()
            .sort((a, b) => (a.parent_id ?? a.id) - (b.parent_id ?? b.id) || (a.parent_id ? 1 : 0) - (b.parent_id ? 1 : 0) || a.sort_order - b.sort_order)
            .map((c) => (
              <PhotoTile
                key={c.id}
                name={c.parent_id ? c.name_en : `${c.name_en} (group)`}
                image={c.image}
                icon={c.icon}
                busy={false}
                onFile={(f) => uploadCover(c, f)}
                onRemove={() => removeCover(c)}
              />
            ))}
        </div>
      </section>

      <h2 className="a-group__title">Dish photos</h2>
      <label className="a-check">
        <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
        Show only dishes without a photo
      </label>

      {groups.map(({ section, items }) => (
        <section key={section.id} className="a-group">
          <h2 className="a-group__title">
            <CategoryIcon name={section.icon} size={20} />
            {section.label}
          </h2>
          <div className="a-photos">
            {items.map((p) => (
              <PhotoTile
                key={p.id}
                name={p.name_en}
                code={p.code}
                image={p.image}
                icon={section.icon}
                busy={busy.has(p.id)}
                onFile={(f) => upload(p, f)}
                onRemove={() => remove(p)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function PhotoTile({
  name,
  code,
  image,
  icon,
  busy,
  onFile,
  onRemove,
}: {
  name: string
  code?: number | null
  image: string | null
  icon: string
  busy: boolean
  onFile: (file: File) => void
  onRemove: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (files: FileList | null) => {
    const file = files?.[0]
    if (file?.type.startsWith('image/')) onFile(file)
  }

  return (
    <div
      className={`a-photo${over ? ' is-over' : ''}${busy ? ' is-busy' : ''}${image ? '' : ' is-missing'}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        take(e.dataTransfer.files)
      }}
    >
      <button className="a-photo__img" onClick={() => input.current?.click()} disabled={busy} aria-label={`Choose photo for ${name}`}>
        {image ? <img src={image} alt="" /> : <CategoryIcon name={icon} size={32} />}
        <span className="a-photo__hover">{busy ? 'Uploading…' : image ? 'Replace' : '+ Add photo'}</span>
      </button>
      <div className="a-photo__meta">
        <span className="a-photo__name">
          {code != null && <span className="a-item__code">{code}</span>} {name}
        </span>
        {image && (
          <button className="a-link a-link--danger" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files)} />
    </div>
  )
}
