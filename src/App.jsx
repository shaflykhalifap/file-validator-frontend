import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './LoginPage'
import Dashboard from './pages/Dashboard'
import { PricePage, InventoryPage, MasterPage } from './pages/ValidatePages'
import HistoryPage from './pages/HistoryPage'
import AccessDenied from './pages/AccessDenied'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function RoleRoute({ children, resource, type }) {
  const { user, canAccess } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!canAccess(resource, type)) return <AccessDenied />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  return !user ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/validate/price"     element={<RoleRoute resource="validate" type="price"><PricePage /></RoleRoute>} />
          <Route path="/validate/inventory" element={<RoleRoute resource="validate" type="inventory"><InventoryPage /></RoleRoute>} />
          <Route path="/validate/master"    element={<RoleRoute resource="validate" type="master"><MasterPage /></RoleRoute>} />
          <Route path="/history/:fileType"  element={<PrivateRoute><HistoryPageGuard /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function HistoryPageGuard() {
  const { canAccess } = useAuth()
  const type = window.location.pathname.split('/').pop()
  if (!canAccess('history', type)) return <AccessDenied />
  return <HistoryPage />
}
