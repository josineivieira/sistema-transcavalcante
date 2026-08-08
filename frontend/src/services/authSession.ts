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

export function setAuthSession(user: AuthUser, accessToken: string) {
  currentUser = user
  currentToken = accessToken
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
}

export function clearAuthSession() {
  currentUser = null
  currentToken = ''
  window.dispatchEvent(new Event('transcavalcante.auth-changed'))
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
