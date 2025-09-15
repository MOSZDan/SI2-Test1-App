import { useState, type FormEvent } from 'react'
import { login, me } from './api'

/* ——— Iconos SVG inline ——— */
const CondoLogo = () => (
  <svg viewBox="0 0 64 64" width="42" height="42" aria-hidden="true">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1fd1f9" />
        <stop offset="1" stopColor="#00a2c7" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#grad)" />
    <path d="M20 35v13h24V35" fill="#fff" />
    <path d="M16 34l16-12 16 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
    <rect x="29" y="39" width="6" height="9" rx="1.5" fill="#00a2c7" />
    <path d="M46 18c4 2 4 4 0 6M42 20c3 1 3 3 0 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
  </svg>
)

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke="#0ea5e9" strokeWidth="1.6"/>
    <path d="M4 7l8 6 8-6" stroke="#0ea5e9" strokeWidth="1.6"/>
  </svg>
)

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="5" y="10" width="14" height="10" rx="2" stroke="#0ea5e9" strokeWidth="1.6"/>
    <path d="M8 10V8a4 4 0 118 0v2" stroke="#0ea5e9" strokeWidth="1.6"/>
  </svg>
)

export default function Login() {
  const [email, setEmail] = useState('residente@condominio.com')
  const [password, setPassword] = useState('admin123')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const data = await login(email, password)
      const access = data.access as string
      localStorage.setItem('token', access)
      const u = await me(access)
      setMsg(`Bienvenido: ${u.first_name || ''} ${u.last_name || ''} (${u.email})`)
    } catch (err: any) {
      setMsg(err?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo"><CondoLogo /></div>

      <h1 className="auth-title">Smart Condominium</h1>
      <p className="auth-subtitle">Ingresa a tu cuenta de residente</p>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-label">Correo Electrónico</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><MailIcon /></span>
          <input
            className="auth-input"
            type="email"
            placeholder="residente@condominio.com"
            autoComplete="username"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <label className="auth-label">Contraseña</label>
        <div className="auth-input-wrap">
          <span className="auth-input-icon"><LockIcon /></span>
          <input
            className="auth-input"
            type={show ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-toggle"
            onClick={() => setShow(v => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            title={show ? 'Ocultar' : 'Mostrar'}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>

        <button className="auth-btn" type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Iniciar Sesión'}
        </button>

        <div className="auth-links">
          <a href="#" className="auth-link">¿Olvidaste tu contraseña?</a>
          <span> · </span>
          <a href="#" className="auth-link">Regístrate aquí</a>
        </div>

        {msg && <p className="auth-msg">{msg}</p>}
      </form>

      <p className="auth-footer">Sistema de Gestión de Condominios · Versión 1.0</p>
    </div>
  )
}
