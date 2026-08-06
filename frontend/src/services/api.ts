import axios from 'axios'

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
