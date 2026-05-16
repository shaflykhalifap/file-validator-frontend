import { createContext, useContext, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

// Permission map per role
// 'admin' = semua akses
// 'user'  = semua akses  
// 'content_team' = hanya master product
export const ROLE_PERMISSIONS = {
  admin: {
    validate: ['price', 'inventory', 'master'],
    history:  ['price', 'inventory', 'master'],
    dashboard: true,
  },
  user: {
    validate: ['price', 'inventory', 'master'],
    history:  ['price', 'inventory', 'master'],
    dashboard: true,
  },
  content_team: {
    validate: ['master'],
    history:  ['master'],
    dashboard: true,
  },
}

export function canAccess(user, resource, type = null) {
  if (!user) return false
  const role = user.role || 'user'
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
  if (resource === 'dashboard') return perms.dashboard
  if (resource === 'validate') return type ? perms.validate.includes(type) : perms.validate.length > 0
  if (resource === 'history') return type ? perms.history.includes(type) : perms.history.length > 0
  return false
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') }
    catch { return null }
  })

  const login = async (email, password) => {
    try {
      const params = new URLSearchParams()
      params.append('email', email)
      params.append('password', password)
      const res = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      const { access_token, user: userData } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.detail || 'Login gagal.' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, canAccess: (r, t) => canAccess(user, r, t) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
