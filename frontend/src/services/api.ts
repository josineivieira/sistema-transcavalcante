import axios from 'axios'
import { clearAuthSession, getAuthToken, markSessionExpired } from './authSession'

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLoginPage = window.location.pathname === '/login'

    if (status === 401 && !isLoginPage) {
      clearAuthSession()
      markSessionExpired()

      if (!redirectingToLogin) {
        redirectingToLogin = true
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)
