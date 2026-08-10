import axios from 'axios'
import {
  clearAuthSession,
  isSessionIdleExpired,
  markSessionExpired,
  refreshAuthSession,
} from './authSession'

function resolveApiUrl() {
  if (
    window.location.hostname.endsWith('.onrender.com')
    && (!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL.includes('transcavalcante-api.onrender.com'))
  ) {
    return 'https://sistema-transcavalcante.onrender.com/api/v1'
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  return 'http://localhost:8000/api/v1'
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
  withCredentials: true,
})

function getCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

function isUnsafeMethod(method?: string) {
  return ['post', 'put', 'patch', 'delete'].includes(String(method || 'get').toLowerCase())
}

api.interceptors.request.use((config) => {
  if (isUnsafeMethod(config.method)) {
    const csrfToken = getCookie('tc_csrf_token')
    if (csrfToken) {
      config.headers = config.headers ?? {}
      config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken)
    }
  }

  return config
})

let redirectingToLogin = false
let refreshPromise: Promise<void> | null = null

function redirectToExpiredLogin() {
  clearAuthSession()
  markSessionExpired()

  if (!redirectingToLogin) {
    redirectingToLogin = true
    window.location.assign('/login')
  }
}

async function refreshActiveSession() {
  if (isSessionIdleExpired()) {
    throw new Error('Session expired')
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{
        session_idle_timeout_minutes?: number,
      }>(`${resolveApiUrl()}/operational-data/refresh`, {}, { withCredentials: true })
      .then((response) => {
        refreshAuthSession(response.data.session_idle_timeout_minutes)
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const isLoginPage = window.location.pathname === '/login'
    const originalRequest = error.config

    if (status === 401 && !isLoginPage) {
      if (!originalRequest?._sessionRetry && !String(originalRequest?.url || '').includes('/operational-data/refresh')) {
        originalRequest._sessionRetry = true

        try {
          await refreshActiveSession()
          return api(originalRequest)
        } catch {
          redirectToExpiredLogin()
        }
      } else {
        redirectToExpiredLogin()
      }
    }

    return Promise.reject(error)
  },
)
