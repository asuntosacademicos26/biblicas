import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, DOMINIO } from '../firebase'

export default function Login() {
  const [usuario,   setUsuario]   = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const navigate = useNavigate()

  async function iniciarSesion(e) {
    e.preventDefault()
    if (!usuario || !password) return setError('Completa usuario y contraseña.')
    setCargando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, usuario + DOMINIO, password)
      // App.jsx detecta el cambio y redirige automáticamente
    } catch (err) {
      setError(traducirError(err.code))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={estilos.centrar}>
      <div style={estilos.card}>
        <h1 style={estilos.titulo}>Asuntos Bíblicos</h1>
        <p style={estilos.subtitulo}>Ingresa con tu usuario y contraseña</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={iniciarSesion}>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              placeholder="ej: guido.quillimamani"
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
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p style={estilos.setupLink}>
          ¿Primera vez?{' '}
          <span style={estilos.link} onClick={() => navigate('/setup')}>
            Crear administrador
          </span>
        </p>
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

const estilos = {
  centrar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh',
  },
  card: {
    background: 'white', borderRadius: 12, padding: '2rem',
    width: '100%', maxWidth: 360,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
  },
  titulo: { textAlign: 'center', marginBottom: '0.4rem', fontSize: '1.5rem' },
  subtitulo: { textAlign: 'center', color: '#718096', fontSize: '0.85rem', marginBottom: '1.8rem' },
  setupLink: { textAlign: 'center', marginTop: '1.2rem', fontSize: '0.8rem', color: '#a0aec0' },
  link: { color: '#4a6fa5', cursor: 'pointer', textDecoration: 'underline' },
}
