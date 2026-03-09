import { useEffect, useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { ref, onValue, set, remove } from 'firebase/database'
import { getDatabase } from 'firebase/database'
import { db, firebaseConfig2, DOMINIO } from '../firebase'

export default function GestionUsuarios({ uidAdmin }) {
  const [usuarios,  setUsuarios]  = useState(null)
  const [nuUsuario, setNuUsuario] = useState('')
  const [nuPass,    setNuPass]    = useState('')
  const [nuRol,     setNuRol]     = useState('lider')
  const [estado,    setEstado]    = useState(null)
  const [cargando,  setCargando]  = useState(false)

  useEffect(() => {
    return onValue(ref(db, 'usuarios'), snap => {
      if (!snap.exists()) { setUsuarios([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.creadoEn - b.creadoEn)
      setUsuarios(lista)
    })
  }, [])

  async function crearUsuario(e) {
    e.preventDefault()
    if (!nuUsuario.trim() || !nuPass) return setEstado({ tipo:'error', msg:'Completa todos los campos.' })
    if (nuPass.length < 6)            return setEstado({ tipo:'error', msg:'La contraseña debe tener al menos 6 caracteres.' })

    setCargando(true)
    setEstado(null)

    let appAux = null
    try {
      // Instancia secundaria → no cierra sesión del admin
      appAux = initializeApp(firebaseConfig2, 'aux_' + Date.now())
      const authAux = getAuth(appAux)

      const email = nuUsuario.trim() + DOMINIO
      const cred  = await createUserWithEmailAndPassword(authAux, email, nuPass)

      await set(ref(db, `usuarios/${cred.user.uid}`), {
        username: nuUsuario.trim(),
        email,
        rol:      nuRol,
        creadoEn: Date.now(),
      })

      setEstado({ tipo:'success', msg:`Usuario "${nuUsuario.trim()}" creado correctamente.` })
      setNuUsuario('')
      setNuPass('')
      setNuRol('usuario')
    } catch (err) {
      setEstado({ tipo:'error', msg: traducirError(err.code) })
    } finally {
      if (appAux) await deleteApp(appAux)
      setCargando(false)
    }
  }

  async function eliminarUsuario(id, username) {
    if (!confirm(`¿Eliminar al usuario "${username}"?`)) return
    await remove(ref(db, `usuarios/${id}`))
  }

  return (
    <>
      <div className="card">
        <h3>Crear nuevo usuario</h3>

        {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

        <form onSubmit={crearUsuario}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.8rem' }}>
            <div className="form-group" style={{ margin:0 }}>
              <label>Usuario</label>
              <input
                type="text"
                placeholder="nombre.apellido"
                value={nuUsuario}
                onChange={e => setNuUsuario(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="mínimo 6 caracteres"
                value={nuPass}
                onChange={e => setNuPass(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop:'0.8rem' }}>
            <label>Rol</label>
            <select value={nuRol} onChange={e => setNuRol(e.target.value)}>
              <option value="lider">Líder</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button className="btn btn-success" disabled={cargando} style={{ marginTop:'0.2rem' }}>
            {cargando ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Usuarios registrados</h3>
        {usuarios === null && <p className="empty-msg">Cargando…</p>}
        {usuarios?.length === 0 && <p className="empty-msg">No hay usuarios.</p>}
        {usuarios && usuarios.length > 0 && (
          <table className="users-table">
            <thead>
              <tr><th>Usuario</th><th>Rol</th><th>Acción</th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td><span className={`badge badge-${u.rol}`}>{u.rol}</span></td>
                  <td>
                    {u.id === uidAdmin
                      ? <span style={{ fontSize:'0.78rem', color:'#a0aec0' }}>Tu cuenta</span>
                      : <button
                          className="btn-danger"
                          onClick={() => eliminarUsuario(u.id, u.username)}
                          title="Eliminar"
                        >✕</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
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
