import type { UserPermission } from './localStore'

export type AuthUser = {
  email: string
  name: string
  role: string
  permissions: Record<string, UserPermission>
  company: string
  remember: boolean
}

let currentUser: AuthUser | null = null
let lastActivityAt = Date.now()
const expiredSessionMessageKey = 'transcavalcante.session-expired-message'
const authSessionKey = 'transcavalcante.auth-session'
const authRememberKey = 'transcavalcante.auth-remember'
let sessionIdleTimeoutMs = 30 * 60 * 1000
let lastActivityPersistedAt = 0

type StoredAuthSession = {
  user: AuthUser
  idleTimeoutMinutes: number
  lastActivityAt: number
}

export const noPrivilegeMessage = 'Você não tem privilégio para essa ação.'

export const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/freights': 'freights',
  '/customers': 'customers',
  '/drivers': 'drivers',
  '/vehicles': 'vehicles',
  '/closings': 'closings',
  '/fiscal-documents': 'fiscalDocuments',
  '/finance': 'finance',
  '/price-lists': 'priceLists',
  '/purchase-requests': 'purchaseRequests',
  '/payroll': 'payroll',
  '/reports': 'reports',
  '/users': 'users',
  '/settings': 'settings',
}

export const moduleDefaultRoutes = [
  '/dashboard',
  '/freights',
  '/customers',
  '/drivers',
  '/vehicles',
  '/closings',
  '/fiscal-documents',
  '/finance',
  '/price-lists',
  '/purchase-requests',
  '/payroll',
  '/reports',
  '/users',
  '/settings',
]

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const remember = localStorage.getItem(authRememberKey) === 'true'
  const storage = remember ? localStorage : sessionStorage
  const rawSession = storage.getItem(authSessionKey)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as StoredAuthSession
  } catch {
    storage.removeItem(authSessionKey)
    return null
  }
}

function removeStoredSession() {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.removeItem(authSessionKey)
  localStorage.removeItem(authSessionKey)
  localStorage.removeItem(authRememberKey)
}

function writeStoredSession() {
  if (typeof window === 'undefined' || !currentUser) {
    return
  }

  const remember = Boolean(currentUser.remember)
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage

  const payload: StoredAuthSession = {
    user: currentUser,
    idleTimeoutMinutes: Math.max(1, Math.round(sessionIdleTimeoutMs / 60000)),
    lastActivityAt,
  }

  otherStorage.removeItem(authSessionKey)
  localStorage.setItem(authRememberKey, remember ? 'true' : 'false')
  storage.setItem(authSessionKey, JSON.stringify(payload))
  lastActivityPersistedAt = Date.now()
}

function restoreStoredSession() {
  const stored = readStoredSession()
  if (!stored) {
    return
  }

  currentUser = stored.user
  sessionIdleTimeoutMs = Math.max(1, stored.idleTimeoutMinutes || 30) * 60 * 1000
  lastActivityAt = stored.lastActivityAt || Date.now()

  if (isSessionIdleExpired()) {
    clearAuthSession()
  }
}

export function setAuthSession(user: AuthUser, idleTimeoutMinutes = 30) {
  currentUser = user
  sessionIdleTimeoutMs = Math.max(1, idleTimeoutMinutes) * 60 * 1000
  lastActivityAt = Date.now()
  writeStoredSession()
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function clearAuthSession() {
  currentUser = null
  removeStoredSession()
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function refreshAuthSession(idleTimeoutMinutes?: number) {
  if (idleTimeoutMinutes) {
    sessionIdleTimeoutMs = Math.max(1, idleTimeoutMinutes) * 60 * 1000
  }
  lastActivityAt = Date.now()
  writeStoredSession()
}

export function markSessionExpired() {
  sessionStorage.setItem(expiredSessionMessageKey, 'Sessão expirada, faça login novamente.')
}

export function consumeSessionExpiredMessage() {
  const message = sessionStorage.getItem(expiredSessionMessageKey) ?? ''
  sessionStorage.removeItem(expiredSessionMessageKey)
  return message
}

export function isAuthenticated() {
  return currentUser !== null
}

export function getAuthUser() {
  return currentUser
}

export function getAuthToken() {
  return ''
}

export function getRefreshToken() {
  return ''
}

export function markAuthActivity() {
  if (currentUser) {
    lastActivityAt = Date.now()
    if (lastActivityAt - lastActivityPersistedAt > 15000) {
      writeStoredSession()
    }
  }
}

export function isSessionIdleExpired() {
  return Date.now() - lastActivityAt > sessionIdleTimeoutMs
}

export function getPermission(moduleKey: string) {
  return currentUser?.permissions[moduleKey] ?? (currentUser?.role === 'Administrador' ? 'edit' : 'none')
}

export function canView(moduleKey: string) {
  return getPermission(moduleKey) !== 'none'
}

export function canEdit(moduleKey: string) {
  return getPermission(moduleKey) === 'edit'
}

export function denyNoPrivilege() {
  window.alert(noPrivilegeMessage)
}

export function canAccessPath(path: string) {
  const moduleKey = routePermissions[path]
  return moduleKey ? canView(moduleKey) : false
}

export function firstAllowedPath() {
  return moduleDefaultRoutes.find((path) => canAccessPath(path)) ?? '/login'
}

if (typeof window !== 'undefined') {
  restoreStoredSession()

  const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, markAuthActivity, { passive: true })
  })
}
