import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, db, DOMINIO } from '../firebase'

export default function Setup() {
  const [usuario,  setUsuario]  = useState('guido.quillimamani')
  const [password, setPassword] = useState('73820210')
  const [estado,   setEstado]   = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  async function crearAdmin(e) {
    e.preventDefault()
    if (!usuario || !password) return setEstado({ tipo:'error', msg:'Completa los campos.' })
    if (password.length < 6)   return setEstado({ tipo:'error', msg:'La contraseña debe tener al menos 6 caracteres.' })

    setCargando(true)
    setEstado(null)

    try {
      // Verificar que no existan usuarios ya
      const snap = await get(ref(db, 'usuarios'))
      if (snap.exists()) {
        setEstado({ tipo:'error', msg:'Ya existe un administrador. Ve a iniciar sesión.' })
        setCargando(false)
        return
      }

      const email = usuario + DOMINIO
      const cred  = await createUserWithEmailAndPassword(auth, email, password)

      await set(ref(db, `usuarios/${cred.user.uid}`), {
        username: usuario,
        email,
        rol:      'admin',
        creadoEn: Date.now(),
      })
      // App.jsx detecta el login y redirige al dashboard
    } catch (err) {
      setEstado({ tipo:'error', msg: traducirError(err.code) })
      setCargando(false)
    }
  }

  return (
    <div style={estilos.centrar}>
      <div style={estilos.card}>
        <h1 style={estilos.titulo}>Configuración inicial</h1>
        <p style={estilos.desc}>
          Crea la cuenta del administrador principal. Solo se puede hacer una vez.
        </p>

        {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

        <form onSubmit={crearAdmin}>
          <div className="form-group">
            <label>Usuario administrador</label>
            <input
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value.trim())}
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={cargando}>
            {cargando ? 'Creando…' : 'Crear administrador'}
          </button>
        </form>

        <p style={estilos.backLink}>
          <span style={estilos.link} onClick={() => navigate('/login')}>
            ← Volver al login
          </span>
        </p>
      </div>
    </div>
  )
}

function traducirError(code) {
  const map = {
    'auth/email-already-in-use':   'Ese usuario ya existe.',
    'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
    'auth/network-request-failed': 'Error de red.',
  }
  return map[code] ?? `Error: ${code}`
}

const estilos = {
  centrar: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' },
  card:    { background:'white', borderRadius:12, padding:'2rem', width:'100%', maxWidth:380, boxShadow:'0 4px 24px rgba(0,0,0,0.1)' },
  titulo:  { fontSize:'1.3rem', marginBottom:'0.4rem' },
  desc:    { fontSize:'0.85rem', color:'#718096', marginBottom:'1.5rem' },
  backLink: { textAlign:'center', marginTop:'1.2rem', fontSize:'0.8rem' },
  link:    { color:'#4a6fa5', cursor:'pointer', textDecoration:'underline' },
}
