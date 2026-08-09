import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

const directStreamUrl = 'https://1.tvlibre.pe/premiere2/mono.m3u8?token=1974db3b1caba098d00d05ad127056cbf7aadb6f-b4-1786327215-1786309215'
const proxiedStreamUrl = `${api.defaults.baseURL}/tvcorinthians/stream.m3u8`

type HlsPlayer = {
  loadSource: (url: string) => void
  attachMedia: (video: HTMLVideoElement) => void
  destroy: () => void
  on: (event: string, callback: (eventName: string, data?: { fatal?: boolean }) => void) => void
}

declare global {
  interface Window {
    Hls?: {
      isSupported: () => boolean
      new(config?: Record<string, unknown>): HlsPlayer
      Events: {
        ERROR: string
        MANIFEST_PARSED: string
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
  const [showOpenLink, setShowOpenLink] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hlsInstance: HlsPlayer | null = null
    let active = true

    async function setupPlayer() {
      if (!video) return

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = directStreamUrl
        setStatus('Ao vivo')
        void video.play().catch(() => setStatus('Toque no play para assistir'))
        return
      }

      try {
        await loadHlsScript()
        if (!active || !window.Hls?.isSupported()) {
          setStatus('Seu navegador nao conseguiu abrir esta transmissao.')
          return
        }

        const attachStream = (url: string, fallbackUsed = false) => {
          hlsInstance?.destroy()
          if (!window.Hls) return

          hlsInstance = new window.Hls({
            lowLatencyMode: true,
            backBufferLength: 60,
          })
          hlsInstance.loadSource(url)
          hlsInstance.attachMedia(video)
          hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
            setStatus('Ao vivo')
            void video.play().catch(() => setStatus('Toque no play para assistir'))
          })
          hlsInstance.on(window.Hls.Events.ERROR, (_eventName, errorData) => {
            if (!fallbackUsed && errorData?.fatal) {
              setStatus('Tentando transmissao direta...')
              attachStream(directStreamUrl, true)
              return
            }
            setStatus('Reconectando transmissao...')
            setShowOpenLink(true)
          })
        }

        setStatus('Carregando transmissao pelo sistema...')
        attachStream(proxiedStreamUrl)
      } catch {
        setStatus('Nao foi possivel carregar o player da transmissao.')
        setShowOpenLink(true)
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
        {showOpenLink && (
          <div className="tv-help">
            <span>Se o video nao iniciar neste navegador, abra a transmissao diretamente.</span>
            <a href={directStreamUrl} target="_blank" rel="noreferrer">Abrir transmissao</a>
          </div>
        )}
      </section>
    </main>
  )
}
