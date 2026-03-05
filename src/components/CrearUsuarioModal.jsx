import { useState, useEffect } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { db, firebaseConfig2, DOMINIO } from '../firebase'

export default function CrearUsuarioModal({ onClose }) {
  const [usuario,  setUsuario]  = useState('')
  const [password, setPassword] = useState('')
  const rol = 'admin'
  const [estado,   setEstado]   = useState(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function crear(e) {
    e.preventDefault()
    if (!usuario.trim() || !password) return setEstado({ tipo:'error', msg:'Completa todos los campos.' })
    if (password.length < 6)          return setEstado({ tipo:'error', msg:'La contraseña debe tener al menos 6 caracteres.' })

    setCargando(true)
    setEstado(null)

    let appAux = null
    try {
      // Instancia secundaria para no afectar la sesión actual
      appAux = initializeApp(firebaseConfig2, 'aux_' + Date.now())
      const authAux = getAuth(appAux)
      const email   = usuario.trim() + DOMINIO
      const cred    = await createUserWithEmailAndPassword(authAux, email, password)

      await set(ref(db, `usuarios/${cred.user.uid}`), {
        username: usuario.trim(),
        email,
        rol,
        creadoEn: Date.now(),
      })

      setEstado({ tipo:'success', msg:`✓ Usuario "${usuario.trim()}" creado correctamente.` })
      setUsuario('')
      setPassword('')
      setRol('usuario')
    } catch (err) {
      setEstado({ tipo:'error', msg: traducirError(err.code) })
    } finally {
      if (appAux) await deleteApp(appAux)
      setCargando(false)
    }
  }

  return (
    <div style={s.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>

        <div style={s.header}>
          <h2 style={s.title}>Crear usuario</h2>
          <button style={s.closeBtn} onClick={onClose} title="Cerrar">✕</button>
        </div>

        <div style={s.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={crear}>
            <div className="form-group">
              <label>Usuario</label>
              <input
                type="text"
                placeholder="nombre.apellido"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-success btn-block" disabled={cargando}>
              {cargando ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

function traducirError(code) {
  const map = {
    'auth/email-already-in-use':   'Ese nombre de usuario ya está registrado.',
    'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
    'auth/network-request-failed': 'Error de red.',
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
    background: 'white', borderRadius: 14,
    width: '100%', maxWidth: 380, margin: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'slideUp 0.2s ease',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.2rem 1.5rem 1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  title:    { fontSize: '1.15rem', color: '#1a202c', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', color: '#a0aec0', cursor: 'pointer', padding: '0.2rem', lineHeight: 1 },
  body:     { padding: '1.4rem 1.5rem 1.5rem' },
}
