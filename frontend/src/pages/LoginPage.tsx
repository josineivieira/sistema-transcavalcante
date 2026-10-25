import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { consumeSessionExpiredMessage, firstAllowedPath, setAuthSession } from '../services/authSession'
import type { AuthUser } from '../services/authSession'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const expiredMessage = consumeSessionExpiredMessage()
    if (expiredMessage) {
      setMessage(expiredMessage)
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setMessage('Informe usuário e senha para continuar.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await api.post<{
        session_idle_timeout_minutes: number,
        user: AuthUser,
      }>('/operational-data/login', {
        email: normalizedEmail,
        password: normalizedPassword,
        remember,
      })

      setAuthSession({
        ...response.data.user,
        company: response.data.user.company ?? 'Transcavalcante - Matriz Manaus/AM',
        remember,
      }, response.data.session_idle_timeout_minutes)
      setLoading(false)
      navigate(firstAllowedPath(), { replace: true })
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Não foi possível validar o acesso. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-window" aria-labelledby="login-title">
        <aside className="login-identity" aria-label="Transcavalcante">
          <img src="/transcavalcante-logo-transparent.png" alt="Transcavalcante" />
          <div className="login-identity-title">
            <span>Transcavalcante</span>
            <h2>Sistema de<br />gestão</h2>
          </div>
          <div className="login-truck-photo" role="img" aria-label="Caminhão na estrada" />
        </aside>

        <div className="login-body">
          <header className="login-header">
            <h1 id="login-title">Login</h1>
          </header>

          <form onSubmit={submit} className="login-form" aria-busy={loading} noValidate>
            <div className="login-field">
              <label htmlFor="usuario">Usuário</label>
              <input
                id="usuario"
                name="usuario"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="senha">Senha</label>
              <div className="login-password">
                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>Lembrar meu acesso</span>
            </label>

            {message ? <div className="login-message" role="status" aria-live="polite">{message}</div> : null}

            <div className="login-actions">
              <button
                className="login-help"
                type="button"
                onClick={() => setMessage('Para recuperar sua senha, entre em contato com o administrador do sistema.')}
              >
                Esqueci minha senha
              </button>
              <button className="login-submit" type="submit" disabled={loading}>
                <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>

      </section>
    </main>
  )
}
