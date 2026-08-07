import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { FreightsPage } from './pages/FreightsPage'
import { ClosingsPage } from './pages/ClosingsPage'
import { FiscalDocumentsPage } from './pages/FiscalDocumentsPage'
import { CustomersPage } from './pages/CustomersPage'
import { DriversPage } from './pages/DriversPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { ContainersPage } from './pages/ContainersPage'
import { FinancePage } from './pages/FinancePage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/UsersPage'
import { PriceListsPage } from './pages/PriceListsPage'
import { canAccessPath, firstAllowedPath, isAuthenticated } from './services/authSession'

function ProtectedPage({ path, children }: { path: string, children: ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessPath(path)) {
    return <Navigate to={firstAllowedPath()} replace />
  }

  return children
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated)

  useEffect(() => {
    function syncAuth() {
      setAuthenticated(isAuthenticated())
    }

    window.addEventListener('transcavalcante.auth-changed', syncAuth)
    return () => {
      window.removeEventListener('transcavalcante.auth-changed', syncAuth)
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to={authenticated ? firstAllowedPath() : '/login'} replace />} />
        <Route path="dashboard" element={<ProtectedPage path="/dashboard"><DashboardPage /></ProtectedPage>} />
        <Route path="freights" element={<ProtectedPage path="/freights"><FreightsPage /></ProtectedPage>} />
        <Route path="closings" element={<ProtectedPage path="/closings"><ClosingsPage /></ProtectedPage>} />
        <Route path="fiscal-documents" element={<ProtectedPage path="/fiscal-documents"><FiscalDocumentsPage /></ProtectedPage>} />
        <Route path="customers" element={<ProtectedPage path="/customers"><CustomersPage /></ProtectedPage>} />
        <Route path="drivers" element={<ProtectedPage path="/drivers"><DriversPage /></ProtectedPage>} />
        <Route path="vehicles" element={<ProtectedPage path="/vehicles"><VehiclesPage /></ProtectedPage>} />
        <Route path="containers" element={<ProtectedPage path="/containers"><ContainersPage /></ProtectedPage>} />
        <Route path="finance" element={<ProtectedPage path="/finance"><FinancePage /></ProtectedPage>} />
        <Route path="price-lists" element={<ProtectedPage path="/price-lists"><PriceListsPage /></ProtectedPage>} />
        <Route path="reports" element={<ProtectedPage path="/reports"><ReportsPage /></ProtectedPage>} />
        <Route path="users" element={<ProtectedPage path="/users"><UsersPage /></ProtectedPage>} />
        <Route path="settings" element={<ProtectedPage path="/settings"><SettingsPage /></ProtectedPage>} />
      </Route>
    </Routes>
  )
}
