import axios from 'axios'
import {
  clearAuthSession,
  getAuthToken,
  getRefreshToken,
  isSessionIdleExpired,
  markSessionExpired,
  replaceAuthTokens,
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
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let redirectingToLogin = false
let refreshPromise: Promise<string> | null = null

function redirectToExpiredLogin() {
  clearAuthSession()
  markSessionExpired()

  if (!redirectingToLogin) {
    redirectingToLogin = true
    window.location.assign('/login')
  }
}

async function refreshActiveSession() {
  const refreshToken = getRefreshToken()

  if (!refreshToken || isSessionIdleExpired()) {
    throw new Error('Session expired')
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{
        access_token: string,
        refresh_token: string,
        session_idle_timeout_minutes?: number,
      }>(`${resolveApiUrl()}/operational-data/refresh`, {
        refresh_token: refreshToken,
      })
      .then((response) => {
        replaceAuthTokens(
          response.data.access_token,
          response.data.refresh_token,
          response.data.session_idle_timeout_minutes,
        )
        return response.data.access_token
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
          const accessToken = await refreshActiveSession()
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
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
