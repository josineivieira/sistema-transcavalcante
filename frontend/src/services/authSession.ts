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

export const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/freights': 'freights',
  '/customers': 'customers',
  '/drivers': 'drivers',
  '/vehicles': 'vehicles',
  '/containers': 'containers',
  '/closings': 'closings',
  '/fiscal-documents': 'fiscalDocuments',
  '/finance': 'finance',
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
  '/containers',
  '/closings',
  '/fiscal-documents',
  '/finance',
  '/reports',
  '/users',
  '/settings',
]

export function setAuthSession(user: AuthUser) {
  currentUser = user
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function clearAuthSession() {
  currentUser = null
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function isAuthenticated() {
  return currentUser !== null
}

export function getAuthUser() {
  return currentUser
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

export function canAccessPath(path: string) {
  const moduleKey = routePermissions[path]
  return moduleKey ? canView(moduleKey) : false
}

export function firstAllowedPath() {
  return moduleDefaultRoutes.find((path) => canAccessPath(path)) ?? '/login'
}
