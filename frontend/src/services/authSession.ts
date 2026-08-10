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
let currentToken = ''
let currentRefreshToken = ''
let lastActivityAt = Date.now()
const expiredSessionMessageKey = 'transcavalcante.session-expired-message'
let sessionIdleTimeoutMs = 30 * 60 * 1000

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
  '/payroll',
  '/reports',
  '/users',
  '/settings',
]

export function setAuthSession(user: AuthUser, accessToken: string, refreshToken = '', idleTimeoutMinutes = 30) {
  currentUser = user
  currentToken = accessToken
  currentRefreshToken = refreshToken
  sessionIdleTimeoutMs = Math.max(1, idleTimeoutMinutes) * 60 * 1000
  lastActivityAt = Date.now()
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function clearAuthSession() {
  currentUser = null
  currentToken = ''
  currentRefreshToken = ''
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function replaceAuthTokens(accessToken: string, refreshToken: string, idleTimeoutMinutes?: number) {
  currentToken = accessToken
  currentRefreshToken = refreshToken
  if (idleTimeoutMinutes) {
    sessionIdleTimeoutMs = Math.max(1, idleTimeoutMinutes) * 60 * 1000
  }
  lastActivityAt = Date.now()
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
  return currentToken
}

export function getRefreshToken() {
  return currentRefreshToken
}

export function markAuthActivity() {
  if (currentUser) {
    lastActivityAt = Date.now()
  }
}

export function isSessionIdleExpired() {
  return Date.now() - lastActivityAt > sessionIdleTimeoutMs
}

export function getPermission(moduleKey: string) {
  return currentUser?.permissions[moduleKey] ?? 'none'
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
  const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, markAuthActivity, { passive: true })
  })
}
