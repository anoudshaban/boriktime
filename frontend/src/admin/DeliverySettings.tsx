import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import type { Settings } from '../types'
import { Field, useToast } from './ui'

const DELIVERY_KEYS = ['delivery_whatsapp', 'delivery_min', 'delivery_from', 'delivery_until', 'pickup_from', 'pickup_until'] as const
type DeliveryKey = (typeof DELIVERY_KEYS)[number]

/** WhatsApp number, delivery minimum and hours, pick-up hours for the guests' Delivery / Pick up page. Empty fields are not shown. */
export function DeliverySettings({ currency }: { currency: string }) {
  const toast = useToast()
  const [values, setValues] = useState<Record<DeliveryKey, string> | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Settings>('/admin/settings')
      .then((s) => setValues(Object.fromEntries(DELIVERY_KEYS.map((k) => [k, String(s[k] ?? '')])) as Record<DeliveryKey, string>))
      .catch(() => {})
  }, [])

  if (!values) return null
  const set = (k: DeliveryKey, v: string) => setValues({ ...values, [k]: v })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const body = Object.fromEntries(DELIVERY_KEYS.map((k) => [k, values[k].trim() === '' ? null : values[k].trim()]))
      await api('/admin/settings', { method: 'PUT', body })
      toast('Delivery & pick-up settings saved')
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.errors)
      toast(error instanceof ApiError ? error.firstError : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="a-card a-res-settings" onSubmit={save}>
      <div className="a-res-settings__head">
        <div>
          <h2 className="a-card__title">Delivery & pick-up settings</h2>
          <p className="a-muted">
            Guests order on the menu’s Delivery / Pick up page and send the order to this WhatsApp number. Turn dishes on with the “Delivery” and “Pick-up” switches
            below (a dish can have one or both). Pick-up has no minimum order. Leave a field empty to not show it.
          </p>
        </div>
      </div>
      <div className="a-grid-2 a-grid-4">
        <Field label="WhatsApp number for orders" hint={values.delivery_whatsapp ? 'e.g. 0795112000' : 'Needed — without it guests can’t send orders'} error={errors.delivery_whatsapp?.[0]}>
          <input type="tel" dir="ltr" inputMode="tel" placeholder="07X XXX XXXX" value={values.delivery_whatsapp} onChange={(e) => set('delivery_whatsapp', e.target.value)} />
        </Field>
        <Field label={`Delivery minimum order (${currency})`} hint="Optional" error={errors.delivery_min?.[0]}>
          <input inputMode="decimal" value={values.delivery_min} onChange={(e) => set('delivery_min', e.target.value.replace(',', '.'))} />
        </Field>
        <Field label="Delivery from" hint="Optional" error={errors.delivery_from?.[0]}>
          <input type="time" value={values.delivery_from} onChange={(e) => set('delivery_from', e.target.value)} />
        </Field>
        <Field label="Delivery until" hint="Past midnight is fine, e.g. 01:00" error={errors.delivery_until?.[0]}>
          <input type="time" value={values.delivery_until} onChange={(e) => set('delivery_until', e.target.value)} />
        </Field>
        <Field label="Pick-up from" hint="Optional" error={errors.pickup_from?.[0]}>
          <input type="time" value={values.pickup_from} onChange={(e) => set('pickup_from', e.target.value)} />
        </Field>
        <Field label="Pick-up until" hint="Guests choose a pick-up time within these hours" error={errors.pickup_until?.[0]}>
          <input type="time" value={values.pickup_until} onChange={(e) => set('pickup_until', e.target.value)} />
        </Field>
      </div>
      <button className="a-btn a-btn--primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save delivery & pick-up settings'}
      </button>
    </form>
  )
}
