import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('transcavalcante.authenticated') === 'true')

  useEffect(() => {
    function syncAuth() {
      setAuthenticated(localStorage.getItem('transcavalcante.authenticated') === 'true')
    }

    window.addEventListener('storage', syncAuth)
    window.addEventListener('transcavalcante.auth-changed', syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('transcavalcante.auth-changed', syncAuth)
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to={authenticated ? '/dashboard' : '/login'} replace />} />
        <Route path="dashboard" element={authenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="freights" element={authenticated ? <FreightsPage /> : <Navigate to="/login" replace />} />
        <Route path="closings" element={authenticated ? <ClosingsPage /> : <Navigate to="/login" replace />} />
        <Route path="fiscal-documents" element={authenticated ? <FiscalDocumentsPage /> : <Navigate to="/login" replace />} />
        <Route path="customers" element={authenticated ? <CustomersPage /> : <Navigate to="/login" replace />} />
        <Route path="drivers" element={authenticated ? <DriversPage /> : <Navigate to="/login" replace />} />
        <Route path="vehicles" element={authenticated ? <VehiclesPage /> : <Navigate to="/login" replace />} />
        <Route path="containers" element={authenticated ? <ContainersPage /> : <Navigate to="/login" replace />} />
        <Route path="finance" element={authenticated ? <FinancePage /> : <Navigate to="/login" replace />} />
        <Route path="reports" element={authenticated ? <ReportsPage /> : <Navigate to="/login" replace />} />
        <Route path="users" element={authenticated ? <UsersPage /> : <Navigate to="/login" replace />} />
        <Route path="settings" element={authenticated ? <SettingsPage /> : <Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}
