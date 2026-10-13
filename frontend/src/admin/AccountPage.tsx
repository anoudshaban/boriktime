import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from './AdminApp'
import { Field, useToast } from './ui'

export function AccountPage() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const updated = await api<{ id: number; name: string; email: string }>('/auth/me', {
        method: 'PUT',
        body: { name, email, current_password: current, password: password || null, password_confirmation: confirm || null },
      })
      setUser(updated)
      setCurrent('')
      setPassword('')
      setConfirm('')
      toast(password ? 'Account saved — password changed' : 'Account saved')
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
          <h1>Your account</h1>
          <p className="a-muted">The email and password you use to sign in to this dashboard.</p>
        </div>
        <button className="a-btn a-btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      <fieldset className="a-card">
        <legend>Profile</legend>
        <div className="a-grid-2">
          <Field label="Name" error={errors.name?.[0]}>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email (used to sign in)" error={errors.email?.[0]}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="a-card">
        <legend>Change password</legend>
        <div className="a-grid-2">
          <Field label="New password" hint="At least 8 characters. Leave empty to keep the current one." error={errors.password?.[0]}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password">
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="a-card">
        <legend>Confirm it's you</legend>
        <Field label="Current password" hint="Required to save any change." error={errors.current_password?.[0]}>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </Field>
      </fieldset>
    </form>
  )
}
