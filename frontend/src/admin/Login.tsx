import { motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../components/brand/Logo'
import { api, ApiError, auth } from '../lib/api'
import { useAuth } from './AdminApp'
import { Field } from './ui'

type LoginResponse = { token: string; user: { id: number; name: string; email: string } }

export function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } })
      auth.token = res.token
      setUser(res.user)
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 429 ? 'Too many attempts. Wait a minute and try again.' : err.firstError) : 'Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="a-login">
      <motion.form
        className="a-login__card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 220 }}
      >
        <Logo className="a-login__logo" motionMode="intro" />
        <h1>Menu admin</h1>
        <Field label="Email">
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && (
          <motion.p className="a-login__error" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}>
            {error}
          </motion.p>
        )}
        <button className="a-btn a-btn--primary a-btn--block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.form>
    </div>
  )
}
