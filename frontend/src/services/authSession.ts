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
