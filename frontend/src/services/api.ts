import axios from 'axios'

function resolveApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (window.location.hostname.endsWith('.onrender.com')) {
    return 'https://sistema-transcavalcante.onrender.com/api/v1'
  }

  return 'http://localhost:8000/api/v1'
}

export const api = axios.create({
  baseURL: resolveApiUrl(),
})
