import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { CloseIcon } from '../components/icons'

/* ---------- Toasts ---------- */

type Toast = { id: number; message: string; tone: 'ok' | 'error' }
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="a-toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`a-toast a-toast--${t.tone}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/* ---------- Form bits ---------- */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} className={`a-switch${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
      <motion.span className="a-switch__knob" layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} />
    </button>
  )
}

export function Field({ label, hint, error, children, wide }: { label: string; hint?: string; error?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`a-field${wide ? ' a-field--wide' : ''}${error ? ' has-error' : ''}`}>
      <span className="a-field__label">{label}</span>
      {children}
      {error ? <span className="a-field__error">{error}</span> : hint ? <span className="a-field__hint">{hint}</span> : null}
    </label>
  )
}

/* ---------- Drawer ---------- */

export function Drawer({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="a-drawer" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="a-drawer__backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="a-drawer__panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
          >
            <header className="a-drawer__head">
              <h2>{title}</h2>
              <button className="a-icon-btn" onClick={onClose} aria-label="Close">
                <CloseIcon size={20} />
              </button>
            </header>
            <div className="a-drawer__body">{children}</div>
            {footer && <footer className="a-drawer__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Image drop zone ---------- */

export function ImageDrop({ src, onFile, onRemove, busy }: { src: string | null; onFile: (file: File) => void; onRemove: () => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = (files: FileList | null) => {
    const file = files?.[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }

  return (
    <div
      className={`a-drop${over ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
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
      {src ? <img src={src} alt="" /> : <span className="a-drop__empty">Drop a photo here</span>}
      <div className="a-drop__actions">
        <button type="button" className="a-btn a-btn--ghost" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : src ? 'Replace photo' : 'Choose photo'}
        </button>
        {src && (
          <button type="button" className="a-btn a-btn--ghost a-btn--danger" onClick={onRemove} disabled={busy}>
            Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files)} />
    </div>
  )
}

/* ---------- Two-step delete ---------- */

export function ConfirmButton({ onConfirm, children, label = 'Delete' }: { onConfirm: () => void; children?: ReactNode; label?: string }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(id)
  }, [armed])

  return (
    <button type="button" className={`a-btn a-btn--danger${armed ? ' is-armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? 'Click again to confirm' : (children ?? label)}
    </button>
  )
}
