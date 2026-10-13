import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './ui'

type Stats = { categories: number; created: number; updated: number; hidden: number }

export function ImportPage() {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [hideMissing, setHideMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true)
    setStats(null)
    const form = new FormData()
    form.append('file', file)
    form.append('hide_missing', hideMissing ? '1' : '0')
    try {
      setStats(await api<Stats>('/admin/import', { method: 'POST', body: form }))
      toast('Menu imported')
    } catch (error) {
      toast(error instanceof ApiError ? error.firstError : 'Import failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="a-page">
      <header className="a-page__head">
        <div>
          <h1>Import from Excel</h1>
          <p className="a-muted">Upload a new version of the menu spreadsheet to update names and prices in one go.</p>
        </div>
      </header>

      <div className="a-card a-import">
        <ol className="a-steps">
          <li>
            Keep the same layout as <strong>FINAL Menu.xlsx</strong>: columns <code>#</code>, <code>Item</code>, <code>الصنف</code>, <code>Final Price</code>.
          </li>
          <li>A row with only a title in the first column starts a new section (e.g. “Bakery”).</li>
          <li>Dishes are matched by their English name — photos, tags and descriptions you added here are kept.</li>
        </ol>

        <button
          className={`a-drop a-drop--file${file ? ' has-file' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            setFile(e.dataTransfer.files[0] ?? null)
          }}
        >
          <span className="a-drop__empty">{file ? `📄 ${file.name}` : 'Drop the .xlsx file here or click to choose'}</span>
        </button>
        <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <label className="a-check">
          <input type="checkbox" checked={hideMissing} onChange={(e) => setHideMissing(e.target.checked)} />
          Hide dishes that are no longer in the spreadsheet
        </label>

        <button className="a-btn a-btn--primary" disabled={!file || busy} onClick={run}>
          {busy ? 'Importing…' : 'Import menu'}
        </button>

        {stats && (
          <motion.div className="a-stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {[
              ['Sections', stats.categories],
              ['New dishes', stats.created],
              ['Updated', stats.updated],
              ['Hidden', stats.hidden],
            ].map(([label, value]) => (
              <div key={label} className="a-stat">
                <span className="a-stat__value">{value}</span>
                <span className="a-stat__label">{label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
