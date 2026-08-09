import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

const streamUrl = `${api.defaults.baseURL}/tvcorinthians/stream.m3u8`

type HlsPlayer = {
  loadSource: (url: string) => void
  attachMedia: (video: HTMLVideoElement) => void
  destroy: () => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    Hls?: {
      isSupported: () => boolean
      new(config?: Record<string, unknown>): HlsPlayer
      Events: {
        ERROR: string
      }
    }
  }
}

function loadHlsScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Hls) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-hls-player="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('HLS indisponivel')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js'
    script.async = true
    script.dataset.hlsPlayer = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('HLS indisponivel'))
    document.head.appendChild(script)
  })
}

export function TvCorinthiansPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState('Carregando transmissao...')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hlsInstance: HlsPlayer | null = null
    let active = true

    async function setupPlayer() {
      if (!video) return

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl
        setStatus('Ao vivo')
        return
      }

      try {
        await loadHlsScript()
        if (!active || !window.Hls?.isSupported()) {
          setStatus('Seu navegador nao conseguiu abrir esta transmissao.')
          return
        }

        hlsInstance = new window.Hls({
          lowLatencyMode: true,
          backBufferLength: 60,
        })
        hlsInstance.loadSource(streamUrl)
        hlsInstance.attachMedia(video)
        window.Hls && hlsInstance.on(window.Hls.Events.ERROR, () => setStatus('Reconectando transmissao...'))
        setStatus('Ao vivo')
      } catch {
        setStatus('Nao foi possivel carregar o player da transmissao.')
      }
    }

    void setupPlayer()

    return () => {
      active = false
      hlsInstance?.destroy()
    }
  }, [])

  return (
    <main className="tv-page">
      <section className="tv-shell">
        <header className="tv-header">
          <div>
            <span>TRANSMISSAO</span>
            <h1>TV Corinthians</h1>
          </div>
          <div className="tv-live-badge">
            <span />
            {status}
          </div>
        </header>

        <div className="tv-frame">
          <video
            ref={videoRef}
            className="tv-video"
            controls
            playsInline
            autoPlay
            muted
          />
        </div>
      </section>
    </main>
  )
}
