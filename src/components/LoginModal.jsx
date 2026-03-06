import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, DOMINIO } from '../config/firebase'

export default function LoginModal({ onClose }) {
  const [usuario,  setUsuario]  = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function iniciarSesion(e) {
    e.preventDefault()
    if (!usuario || !password) return setError('Completa usuario y contraseña.')
    setCargando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, usuario + DOMINIO, password)
    } catch (err) {
      setError(traducirError(err.code))
      setCargando(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>

        <div style={s.header}>
          <div>
            <h2 style={s.title}>Bienvenido</h2>
            <p style={s.subtitle}>Ingresa tus credenciales para continuar</p>
          </div>
          <button style={s.closeBtn} onClick={onClose} title="Cerrar">✕</button>
        </div>

        <div style={s.body}>
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={iniciarSesion}>
            <div className="form-group">
              <label>Usuario</label>
              <input
                type="text"
                placeholder="nombre.apellido"
                value={usuario}
                onChange={e => setUsuario(e.target.value.trim())}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" style={{ marginTop: '0.4rem' }} disabled={cargando}>
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

function traducirError(code) {
  const map = {
    'auth/user-not-found':        'Usuario no encontrado.',
    'auth/wrong-password':        'Contraseña incorrecta.',
    'auth/invalid-credential':    'Usuario o contraseña incorrectos.',
    'auth/too-many-requests':     'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed':'Error de red. Revisa tu conexión.',
  }
  return map[code] ?? `Error: ${code}`
}

const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.18s ease',
  },
  modal: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 18, width: '100%', maxWidth: 400, margin: '1rem',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.6rem 1.6rem 1.2rem',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)',
  },
  title:    { fontSize: '1.25rem', color: 'white', fontWeight: 800, letterSpacing: '-0.01em' },
  subtitle: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.2rem' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    color: 'white', cursor: 'pointer', borderRadius: 8,
    width: 30, height: 30, fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s', flexShrink: 0,
  },
  body: { padding: '1.6rem' },
}
