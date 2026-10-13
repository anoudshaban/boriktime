import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { Settings } from '../types'
import { Field, useToast } from './ui'

type Key = keyof Settings
type Row = { key: Key; label: string; rtl?: boolean; multiline?: boolean; hint?: string; type?: string }

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Brand',
    rows: [
      { key: 'name_en', label: 'Name (English)' },
      { key: 'name_ar', label: 'الاسم (عربي)', rtl: true },
      { key: 'tagline_en', label: 'Tagline (English)' },
      { key: 'tagline_ar', label: 'الشعار (عربي)', rtl: true },
    ],
  },
  {
    title: 'Currency',
    rows: [
      { key: 'currency_en', label: 'Currency (English)', hint: 'e.g. JOD' },
      { key: 'currency_ar', label: 'العملة (عربي)', rtl: true, hint: 'مثال: د.أ' },
    ],
  },
  {
    title: 'Contact & social',
    rows: [
      { key: 'phone', label: 'Phone', hint: 'Shown in the footer with a tap-to-call link' },
      { key: 'whatsapp', label: 'WhatsApp number', hint: 'International format, e.g. +962 79 000 0000' },
      { key: 'instagram', label: 'Instagram URL', type: 'url' },
      { key: 'facebook', label: 'Facebook URL', type: 'url' },
    ],
  },
  {
    title: 'Location & hours',
    rows: [
      { key: 'address_en', label: 'Address (English)' },
      { key: 'address_ar', label: 'العنوان (عربي)', rtl: true },
      { key: 'map_url', label: 'Google Maps link', type: 'url' },
      { key: 'hours_en', label: 'Opening hours (English)', multiline: true, hint: 'One line per day range' },
      { key: 'hours_ar', label: 'ساعات العمل (عربي)', rtl: true, multiline: true },
    ],
  },
  {
    title: 'Footer note',
    rows: [
      { key: 'note_en', label: 'Note (English)', multiline: true },
      { key: 'note_ar', label: 'ملاحظة (عربي)', rtl: true, multiline: true },
    ],
  },
]

export function SettingsPage() {
  const toast = useToast()
  const [values, setValues] = useState<Partial<Record<Key, string>>>({})
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Settings>('/admin/settings')
      .then((s) => setValues(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? '']))))
      .catch(() => toast('Could not load settings', 'error'))
  }, [toast])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const body = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]))
      await api('/admin/settings', { method: 'PUT', body })
      toast('Restaurant info saved')
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-page" onSubmit={save}>
      <header className="a-page__head">
        <div>
          <h1>Restaurant info</h1>
          <p className="a-muted">Shown in the menu header and footer. Empty fields are hidden.</p>
        </div>
        <button className="a-btn a-btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      {GROUPS.map((group) => (
        <fieldset key={group.title} className="a-card">
          <legend>{group.title}</legend>
          <div className="a-grid-2">
            {group.rows.map((row) => {
              const props = {
                value: values[row.key] ?? '',
                dir: row.rtl ? 'rtl' : undefined,
                lang: row.rtl ? 'ar' : undefined,
                onChange: (e: { target: { value: string } }) => setValues((v) => ({ ...v, [row.key]: e.target.value })),
              }
              return (
                <Field key={row.key} label={row.label} hint={row.hint} error={errors[row.key]?.[0]}>
                  {row.multiline ? <textarea rows={3} {...props} /> : <input type={row.type ?? 'text'} {...props} />}
                </Field>
              )
            })}
          </div>
        </fieldset>
      ))}
    </form>
  )
}
