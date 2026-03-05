import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, DOMINIO } from '../firebase'

export default function LoginModal({ onClose }) {
  const [usuario,  setUsuario]  = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [cargando, setCargando] = useState(false)

  // Cerrar con Escape
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
      // App.jsx detecta el cambio y muestra el Dashboard
    } catch (err) {
      setError(traducirError(err.code))
      setCargando(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>

        {/* Header del modal */}
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Ingresar</h2>
          <button style={s.closeBtn} onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* Body */}
        <div style={s.modalBody}>
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
            <button className="btn btn-primary btn-block" disabled={cargando}>
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
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'white',
    borderRadius: 14,
    width: '100%',
    maxWidth: 380,
    margin: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.2s ease',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.2rem 1.5rem 1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: { fontSize: '1.15rem', color: '#1a202c', margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '1.1rem',
    color: '#a0aec0', cursor: 'pointer', padding: '0.2rem',
    lineHeight: 1,
  },
  modalBody: { padding: '1.4rem 1.5rem 1.5rem' },
}
