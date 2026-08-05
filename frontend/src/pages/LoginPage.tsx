import { ArrowRight, BarChart3, Clock3, Eye, EyeOff, Lock, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setMessage('Informe usuario e senha para continuar.')
      return
    }

    if (normalizedEmail !== 'admin@transcavalcante.local' || normalizedPassword !== 'admin123') {
      setMessage('Usuario ou senha invalido. Use admin@transcavalcante.local / admin123.')
      return
    }

    setLoading(true)
    setMessage('Validando acesso...')

    window.setTimeout(() => {
      localStorage.setItem('transcavalcante.authenticated', 'true')
      localStorage.setItem(
        'transcavalcante.user',
        JSON.stringify({
          email: normalizedEmail,
          company: 'Transcavalcante - Matriz Manaus/AM',
          remember,
        }),
      )
      window.dispatchEvent(new Event('transcavalcante.auth-changed'))
      setLoading(false)
      navigate('/dashboard', { replace: true })
    }, 450)
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="Apresentacao da empresa">
        <div className="brand-glow brand-glow-one" />
        <div className="brand-glow brand-glow-two" />

        <div className="brand-content">
          <img className="brand-logo" src="/logo-trans-cavalcante.png" alt="Logo Trans Cavalcante" />

          <div className="brand-message">
            <h1>
              Solucoes que movem.
              <br />
              <span>Resultados que permanecem.</span>
            </h1>
            <span className="brand-title-line" />
          </div>

          <div className="brand-benefits">
            <article className="benefit-card">
              <div className="benefit-icon">
                <ShieldCheck size={34} />
              </div>
              <strong>Seguranca</strong>
              <span>Protecao de dados em primeiro lugar.</span>
            </article>

            <article className="benefit-card">
              <div className="benefit-icon">
                <BarChart3 size={34} />
              </div>
              <strong>Confiabilidade</strong>
              <span>Informacoes precisas e sempre disponiveis.</span>
            </article>

            <article className="benefit-card">
              <div className="benefit-icon">
                <Clock3 size={34} />
              </div>
              <strong>Performance</strong>
              <span>Tecnologia para trazer agilidade ao seu dia.</span>
            </article>
          </div>
        </div>
      </section>

      <section className="form-panel">
        <div className="login-card">
          <div className="mobile-logo-wrapper">
            <img className="mobile-logo" src="/logo-trans-cavalcante.png" alt="Logo Trans Cavalcante" />
          </div>

          <header className="login-header">
            <div className="login-icon">
              <UserRound size={37} />
            </div>

            <h2>Bem-vindo(a)!</h2>
            <p>Acesse sua conta para continuar</p>
            <span className="header-line" />
          </header>

          <form onSubmit={submit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="usuario">Usuario</label>

              <div className="input-wrapper">
                <span className="input-icon">
                  <UserRound size={24} />
                </span>

                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  placeholder="Digite seu usuario"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>

              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={24} />
                </span>

                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span className="custom-checkbox">
                  <ShieldCheck size={13} />
                </span>
                <span>Lembrar-me</span>
              </label>

              <button
                className="forgot-password"
                type="button"
                onClick={() => setMessage('Recuperacao de senha sera integrada ao cadastro de usuarios.')}
              >
                Esqueci minha senha
              </button>
            </div>

            <button className="submit-button" type="submit" disabled={loading}>
              <span>{loading ? 'Validando...' : 'Entrar'}</span>
              <ArrowRight size={27} />
            </button>

            {message ? <div className="form-message">{message}</div> : null}
          </form>

          <footer className="login-footer">
            <div className="login-divider">
              <span />
              ou
              <span />
            </div>

            <div className="security-message">
              <ShieldCheck size={36} />

              <div>
                <strong>Acesso seguro e protegido</strong>
                <span>Seus dados estao protegidos conosco.</span>
              </div>
            </div>
          </footer>
        </div>

        <p className="login-copyright">© 2024 <strong>Trans Cavalcante.</strong> Todos os direitos reservados.</p>
      </section>
    </main>
  )
}
