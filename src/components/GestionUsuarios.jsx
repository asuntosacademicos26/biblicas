import { useEffect, useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { ref, onValue, set, update, remove } from 'firebase/database'
import { db, firebaseConfig2, DOMINIO } from '../config/firebase'

export default function GestionUsuarios({ uidAdmin }) {
  const [usuarios,     setUsuarios]     = useState(null)
  const [modalCrear,   setModalCrear]   = useState(false)
  const [usuarioEditar, setUsuarioEditar] = useState(null)
  const [toastExito,   setToastExito]   = useState(null)

  useEffect(() => {
    return onValue(ref(db, 'usuarios'), snap => {
      if (!snap.exists()) { setUsuarios([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.creadoEn - b.creadoEn)
      setUsuarios(lista)
    })
  }, [])

  async function eliminarUsuario(id, username) {
    if (!confirm(`¿Eliminar al usuario "${username}"?`)) return
    await remove(ref(db, `usuarios/${id}`))
  }

  return (
    <>
      <div className="card">
        <div style={f.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>Usuarios registrados</h3>
          <button className="btn btn-primary" style={f.btnCrear} onClick={() => setModalCrear(true)}>
            + Crear usuario
          </button>
        </div>

        {usuarios === null && <p className="empty-msg">Cargando…</p>}
        {usuarios?.length === 0 && <p className="empty-msg">No hay usuarios registrados.</p>}
        {usuarios && usuarios.length > 0 && (
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre completo</th>
                <th>DNI</th>
                <th>Celular</th>
                <th>Rol</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td><strong style={{ color: '#023052' }}>{u.username}</strong></td>
                  <td style={{ color: '#475569' }}>{u.nombreCompleto || '—'}</td>
                  <td style={{ color: '#475569' }}>{u.dni || '—'}</td>
                  <td style={{ color: '#475569' }}>{u.celular || '—'}</td>
                  <td>
                    <span className={`badge badge-${u.rol}`}>
                      {u.rol === 'admin' ? 'Administrador' : 'Docente'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={f.acciones}>
                      {u.id !== uidAdmin && (
                        <>
                          <button
                            style={f.btnEdit}
                            className="btn-edit-icon"
                            title="Editar usuario"
                            onClick={() => setUsuarioEditar(u)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            className="btn-danger-outline"
                            onClick={() => eliminarUsuario(u.id, u.username)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                      {u.id === uidAdmin && (
                        <span style={f.tuCuenta}>Tu cuenta</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalCrear && (
        <ModalCrearUsuario
          onClose={() => setModalCrear(false)}
          onSuccess={nombre => {
            setModalCrear(false)
            setToastExito(nombre)
            setTimeout(() => setToastExito(null), 3500)
          }}
        />
      )}

      {toastExito && (
        <div style={f.toastCentro}>
          <div style={f.toastIcono}>✓</div>
          <div>
            <div style={f.toastTitulo}>Usuario creado con éxito</div>
            <div style={f.toastSub}>"{toastExito}" ya puede iniciar sesión</div>
          </div>
        </div>
      )}
      {usuarioEditar && (
        <ModalEditarUsuario
          usuario={usuarioEditar}
          onClose={() => setUsuarioEditar(null)}
        />
      )}
    </>
  )
}

/* ══════════════════════════════
   MODAL CREAR USUARIO
══════════════════════════════ */
function ModalCrearUsuario({ onClose, onSuccess }) {
  const [form,     setForm]     = useState({ usuario: '', nombreCompleto: '', dni: '', correo: '', celular: '', password: '', rol: 'docente' })
  const [estado,   setEstado]   = useState(null)
  const [cargando, setCargando] = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function crear(e) {
    e.preventDefault()
    const { usuario, nombreCompleto, dni, correo, celular, password, rol } = form
    if (!usuario.trim() || !password || !nombreCompleto.trim() || !dni.trim())
      return setEstado({ tipo: 'error', msg: 'Completa todos los campos obligatorios.' })
    if (password.length < 6)
      return setEstado({ tipo: 'error', msg: 'La contraseña debe tener al menos 6 caracteres.' })

    setCargando(true)
    setEstado(null)
    let appAux = null
    try {
      appAux = initializeApp(firebaseConfig2, 'aux_' + Date.now())
      const authAux = getAuth(appAux)
      const email   = usuario.trim() + DOMINIO
      const cred    = await createUserWithEmailAndPassword(authAux, email, password)

      await set(ref(db, `usuarios/${cred.user.uid}`), {
        username:      usuario.trim(),
        nombreCompleto: nombreCompleto.trim(),
        dni:           dni.trim(),
        correo:        correo.trim(),
        celular:       celular.trim(),
        email,
        rol,
        creadoEn: Date.now(),
      })

      onSuccess(usuario.trim())
    } catch (err) {
      setEstado({ tipo: 'error', msg: traducirError(err.code) })
    } finally {
      if (appAux) await deleteApp(appAux)
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Crear usuario</h2>
            <p style={m.subtitle}>Completa los datos del nuevo usuario</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={crear}>
            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Usuario <Req /></label>
                <input placeholder="nombre.apellido" value={form.usuario} onChange={set_('usuario')} autoFocus />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Rol <Req /></label>
                <select value={form.rol} onChange={set_('rol')}>
                  <option value="docente">Docente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Nombre completo <Req /></label>
              <input placeholder="Ej: Juan Pérez López" value={form.nombreCompleto} onChange={set_('nombreCompleto')} />
            </div>

            <div style={{ ...m.grid2, marginTop: 0 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>DNI <Req /></label>
                <input placeholder="12345678" maxLength={8} value={form.dni} onChange={set_('dni')} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Celular</label>
                <input placeholder="987654321" value={form.celular} onChange={set_('celular')} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Correo electrónico</label>
              <input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={set_('correo')} />
            </div>

            <div className="form-group">
              <label>Contraseña <Req /></label>
              <input type="password" placeholder="mínimo 6 caracteres" value={form.password} onChange={set_('password')} />
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════
   MODAL EDITAR USUARIO
══════════════════════════════ */
function ModalEditarUsuario({ usuario, onClose }) {
  const [form,     setForm]     = useState({
    nombreCompleto: usuario.nombreCompleto || '',
    dni:            usuario.dni     || '',
    correo:         usuario.correo  || '',
    celular:        usuario.celular || '',
    rol:            usuario.rol,
    newPass:        '',
  })
  const [estado,   setEstado]   = useState(null)
  const [cargando, setCargando] = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombreCompleto.trim() || !form.dni.trim())
      return setEstado({ tipo: 'error', msg: 'Nombre y DNI son obligatorios.' })
    if (form.newPass && form.newPass.length < 6)
      return setEstado({ tipo: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres.' })

    setCargando(true)
    setEstado(null)
    try {
      await update(ref(db, `usuarios/${usuario.id}`), {
        nombreCompleto: form.nombreCompleto.trim(),
        dni:            form.dni.trim(),
        correo:         form.correo.trim(),
        celular:        form.celular.trim(),
        rol:            form.rol,
      })
      setEstado({ tipo: 'success', msg: 'Datos actualizados correctamente.' })
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar los cambios.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Editar usuario</h2>
            <p style={m.subtitle}>@{usuario.username}</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={guardar}>
            <div className="form-group">
              <label>Nombre completo <Req /></label>
              <input placeholder="Juan Pérez López" value={form.nombreCompleto} onChange={set_('nombreCompleto')} autoFocus />
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>DNI <Req /></label>
                <input placeholder="12345678" maxLength={8} value={form.dni} onChange={set_('dni')} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Celular</label>
                <input placeholder="987654321" value={form.celular} onChange={set_('celular')} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Correo electrónico</label>
              <input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={set_('correo')} />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <select value={form.rol} onChange={set_('rol')}>
                <option value="docente">Docente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Resetear contraseña */}
            <div style={m.resetSection}>
              <div style={m.resetLabel}>
                <IconLock /> Resetear contraseña
              </div>
              <input
                type="password"
                placeholder="Nueva contraseña (dejar vacío para no cambiar)"
                value={form.newPass}
                onChange={set_('newPass')}
                style={{ marginTop: '0.5rem' }}
              />
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function Req() {
  return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
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

/* ── Estilos ── */
const f = {
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  btnCrear:  { padding: '0.45rem 1.1rem', fontSize: '0.86rem' },
  tuCuenta:  { fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' },
  toastCentro: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(6,95,70,0.92)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white', borderRadius: 18,
    padding: '1.8rem 2.4rem',
    display: 'flex', alignItems: 'center', gap: '1.2rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    zIndex: 3000, animation: 'slideUp 0.28s ease',
    minWidth: 300,
  },
  toastIcono: {
    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.6rem', fontWeight: 900,
  },
  toastTitulo: { fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.2rem' },
  toastSub:    { fontSize: '0.85rem', opacity: 0.8 },
  acciones:  { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' },
  btnEdit: {
    background: '#f1f5f9', border: '1.5px solid #e2e8f0',
    color: '#023052', borderRadius: 8,
    width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
    flexShrink: 0,
  },
}

const m = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.18s ease',
  },
  modal: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 18, width: '100%', maxWidth: 460, margin: '1rem',
    boxShadow: '0 8px 40px rgba(2,48,82,0.18)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.5rem 1.6rem 1.2rem',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)',
    flexShrink: 0,
  },
  title:    { fontSize: '1.2rem', color: 'white', fontWeight: 800, margin: 0 },
  subtitle: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    color: 'white', cursor: 'pointer', borderRadius: 8,
    width: 30, height: 30, fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', flexShrink: 0,
  },
  body: { padding: '1.6rem', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem', marginBottom: '0.9rem' },
  resetSection: {
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: 10, padding: '1rem',
    marginBottom: '1rem',
  },
  resetLabel: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.83rem', fontWeight: 700, color: '#023052',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem',
  },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
