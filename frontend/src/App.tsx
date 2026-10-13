import { MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './lib/i18n'
import MenuPage from './menu/MenuPage'

// Guests never download the admin bundle.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="admin-boot" />}>
                <AdminApp />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <I18nProvider>
                <MenuPage />
              </I18nProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
