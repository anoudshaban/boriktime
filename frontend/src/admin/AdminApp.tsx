import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { api, auth } from '../lib/api'
import './admin.css'
import './admin-pages.css'
import { AccountPage } from './AccountPage'
import { CategoriesPage } from './CategoriesPage'
import { Dashboard } from './Dashboard'
import { ImportPage } from './ImportPage'
import { Layout } from './Layout'
import { Login } from './Login'
import { OffersPage } from './OffersPage'
import { PhotosPage } from './PhotosPage'
import { ProductsPage } from './ProductsPage'
import { QrPage } from './QrPage'
import { OrdersPage } from './OrdersPage'
import { ReservationsPage } from './ReservationsPage'
import { SettingsPage } from './SettingsPage'
import { ToastProvider } from './ui'

type User = { id: number; name: string; email: string }
type AuthState = { user: User | null; setUser: (u: User | null) => void; logout: () => Promise<void> }

const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AdminApp')
  return ctx
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(Boolean(auth.token))

  // The admin is English/LTR regardless of the language picked on the menu.
  useEffect(() => {
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
    document.title = 'Börek Time — Admin'
  }, [])

  useEffect(() => {
    if (!auth.token) return
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => (auth.token = null))
      .finally(() => setChecking(false))
  }, [])

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    auth.token = null
    setUser(null)
  }

  if (checking) return <div className="admin-boot" />

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <ToastProvider>
        <Routes>
          <Route path="login" element={user ? <Navigate to="/admin" replace /> : <Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="qr" element={<QrPage />} />
              <Route path="dishes" element={<ProductsPage />} />
              <Route path="photos" element={<PhotosPage />} />
              <Route path="offers" element={<OffersPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="import" element={<ImportPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ToastProvider>
    </AuthContext.Provider>
  )
}

function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
