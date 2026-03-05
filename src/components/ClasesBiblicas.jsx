import { useEffect, useState } from 'react'
import { ref, onValue, push, set, remove, update } from 'firebase/database'
import { db } from '../config/firebase'

export default function ClasesBiblicas() {
  const [clases,       setClases]       = useState(null)
  const [docentes,     setDocentes]     = useState([])
  const [claseActiva,  setClaseActiva]  = useState(null)
  const [modalCrear,   setModalCrear]   = useState(false)
  const [modalAlumno,  setModalAlumno]  = useState(false)

  // Cargar clases
  useEffect(() => {
    return onValue(ref(db, 'clases'), snap => {
      if (!snap.exists()) { setClases([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data, alumnos: data.alumnos ? Object.entries(data.alumnos).map(([aid, a]) => ({ id: aid, ...a })) : [] }))
        .sort((a, b) => b.creadoEn - a.creadoEn)
      setClases(lista)
      // Si hay una clase activa, actualizarla
      if (claseActiva) {
        const actualizada = lista.find(c => c.id === claseActiva.id)
        if (actualizada) setClaseActiva(actualizada)
      }
    })
  }, [])

  // Cargar docentes
  useEffect(() => {
    return onValue(ref(db, 'usuarios'), snap => {
      if (!snap.exists()) { setDocentes([]); return }
      const lista = Object.entries(snap.val())
        .filter(([, d]) => d.rol === 'docente' || d.rol === 'admin')
        .map(([id, d]) => ({ id, ...d }))
      setDocentes(lista)
    })
  }, [])

  async function eliminarClase(id, nombre) {
    if (!confirm(`¿Eliminar la clase "${nombre}"?`)) return
    await remove(ref(db, `clases/${id}`))
    if (claseActiva?.id === id) setClaseActiva(null)
  }

  async function eliminarAlumno(claseId, alumnoId, nombre) {
    if (!confirm(`¿Quitar a "${nombre}" de la clase?`)) return
    await remove(ref(db, `clases/${claseId}/alumnos/${alumnoId}`))
  }

  // Vista detalle de clase
  if (claseActiva) {
    const docente = docentes.find(d => d.id === claseActiva.docenteId)
    return (
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <span style={s.breadLink} onClick={() => setClaseActiva(null)}>Clases Bíblicas</span>
          <span style={s.sep}>›</span>
          <span>{claseActiva.nombre}</span>
        </div>

        {/* Info de la clase */}
        <div className="card" style={s.claseHeader}>
          <div>
            <h2 style={s.claseNombre}>{claseActiva.nombre}</h2>
            {claseActiva.descripcion && <p style={s.claseDesc}>{claseActiva.descripcion}</p>}
          </div>
          <div style={s.docenteBox}>
            <div style={s.docenteLabel}>Docente asignado</div>
            {docente ? (
              <div style={s.docenteInfo}>
                <div style={s.docenteAvatar}>
                  {(docente.nombreCompleto || docente.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={s.docenteNombre}>{docente.nombreCompleto || docente.username}</div>
                  <div style={s.docenteUser}>@{docente.username}</div>
                </div>
              </div>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '0.86rem' }}>Sin docente asignado</span>
            )}
          </div>
        </div>

        {/* Alumnos */}
        <div className="card">
          <div style={s.cardHeader}>
            <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
              Alumnos
              {claseActiva.alumnos.length > 0 && (
                <span style={s.countBadge}>{claseActiva.alumnos.length}</span>
              )}
            </h3>
            <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalAlumno(true)}>
              + Agregar alumno
            </button>
          </div>

          {claseActiva.alumnos.length === 0 && (
            <p className="empty-msg">No hay alumnos en esta clase.</p>
          )}

          {claseActiva.alumnos.length > 0 && (
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre completo</th>
                  <th>DNI</th>
                  <th>Correo</th>
                  <th>Celular</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {claseActiva.alumnos.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: '#94a3b8', width: 36 }}>{i + 1}</td>
                    <td><strong style={{ color: '#023052' }}>{a.nombreCompleto}</strong></td>
                    <td style={{ color: '#475569' }}>{a.dni || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.correo || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.celular || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-danger-outline"
                        onClick={() => eliminarAlumno(claseActiva.id, a.id, a.nombreCompleto)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {modalAlumno && (
          <ModalAgregarAlumno
            claseId={claseActiva.id}
            onClose={() => setModalAlumno(false)}
          />
        )}
      </div>
    )
  }

  // Vista principal: lista de clases
  return (
    <>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>Clases Bíblicas</h3>
          <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalCrear(true)}>
            + Crear clase
          </button>
        </div>

        {clases === null && <p className="empty-msg">Cargando…</p>}
        {clases?.length === 0 && <p className="empty-msg">No hay clases creadas aún.</p>}

        {clases && clases.length > 0 && (
          <div style={s.clasesGrid}>
            {clases.map(c => {
              const docente = docentes.find(d => d.id === c.docenteId)
              return (
                <ClaseCard
                  key={c.id}
                  clase={c}
                  docente={docente}
                  onClick={() => setClaseActiva(c)}
                  onEliminar={() => eliminarClase(c.id, c.nombre)}
                />
              )
            })}
          </div>
        )}
      </div>

      {modalCrear && (
        <ModalCrearClase
          docentes={docentes}
          onClose={() => setModalCrear(false)}
        />
      )}
    </>
  )
}

/* ── Tarjeta de clase ── */
function ClaseCard({ clase, docente, onClick, onEliminar }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        ...s.claseCard,
        boxShadow: hovered ? '0 8px 28px rgba(2,48,82,0.16)' : '0 2px 10px rgba(2,48,82,0.08)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.claseCardTop} onClick={onClick}>
        <div style={s.claseCardIcon}>📖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.claseCardNombre}>{clase.nombre}</div>
          {clase.descripcion && (
            <div style={s.claseCardDesc}>{clase.descripcion}</div>
          )}
        </div>
      </div>

      <div style={s.claseCardFooter}>
        <div style={s.claseCardMeta}>
          <span style={s.metaItem}>
            <IconPersonas /> {clase.alumnos.length} alumno{clase.alumnos.length !== 1 ? 's' : ''}
          </span>
          {docente && (
            <span style={s.metaItem}>
              <IconDocente /> {docente.nombreCompleto || docente.username}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={s.btnVerClase} onClick={onClick}>Ver →</button>
          <button
            className="btn-danger-outline"
            style={{ fontSize: '0.78rem', padding: '0.28rem 0.65rem' }}
            onClick={e => { e.stopPropagation(); onEliminar() }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal crear clase ── */
function ModalCrearClase({ docentes, onClose }) {
  const [nombre,      setNombre]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [docenteId,   setDocenteId]   = useState('')
  const [estado,      setEstado]      = useState(null)
  const [cargando,    setCargando]    = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function crear(e) {
    e.preventDefault()
    if (!nombre.trim()) return setEstado({ tipo: 'error', msg: 'El nombre de la clase es obligatorio.' })
    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, 'clases'), {
        nombre:      nombre.trim(),
        descripcion: descripcion.trim(),
        docenteId:   docenteId || null,
        creadoEn:    Date.now(),
      })
      onClose()
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al crear la clase.' })
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Crear clase</h2>
            <p style={m.subtitle}>Configura la nueva clase bíblica</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}
          <form onSubmit={crear}>
            <div className="form-group">
              <label>Nombre de la clase <span style={{ color: '#ef4444' }}>*</span></label>
              <input placeholder="Ej: Evangelio de Juan" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea placeholder="Breve descripción de la clase…" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ minHeight: 72 }} />
            </div>
            <div className="form-group">
              <label>Docente asignado</label>
              <select value={docenteId} onChange={e => setDocenteId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {docentes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombreCompleto || d.username}
                  </option>
                ))}
              </select>
            </div>
            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Creando…' : 'Crear clase'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Modal agregar alumno ── */
function ModalAgregarAlumno({ claseId, onClose }) {
  const [form,     setForm]     = useState({ nombreCompleto: '', dni: '', correo: '', celular: '' })
  const [estado,   setEstado]   = useState(null)
  const [cargando, setCargando] = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function agregar(e) {
    e.preventDefault()
    if (!form.nombreCompleto.trim()) return setEstado({ tipo: 'error', msg: 'El nombre completo es obligatorio.' })
    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, `clases/${claseId}/alumnos`), {
        nombreCompleto: form.nombreCompleto.trim(),
        dni:            form.dni.trim(),
        correo:         form.correo.trim(),
        celular:        form.celular.trim(),
        creadoEn:       Date.now(),
      })
      setEstado({ tipo: 'success', msg: `Alumno "${form.nombreCompleto.trim()}" agregado.` })
      setForm({ nombreCompleto: '', dni: '', correo: '', celular: '' })
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al agregar el alumno.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Agregar alumno</h2>
            <p style={m.subtitle}>Registra un alumno en esta clase</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}
          <form onSubmit={agregar}>
            <div className="form-group">
              <label>Nombre completo <span style={{ color: '#ef4444' }}>*</span></label>
              <input placeholder="Juan Pérez López" value={form.nombreCompleto} onChange={set_('nombreCompleto')} autoFocus />
            </div>
            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>DNI</label>
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
            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Agregando…' : 'Agregar alumno'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Iconos ── */
function IconPersonas() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconDocente() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

/* ── Estilos ── */
const s = {
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' },
  breadLink:  { cursor: 'pointer', color: '#023052', fontWeight: 700, textDecoration: 'underline' },
  sep:        { opacity: 0.4 },

  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  btnSm: { padding: '0.45rem 1.1rem', fontSize: '0.86rem' },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },

  clasesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.2rem',
    marginTop: '0.2rem',
  },

  claseCard: {
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: 14, overflow: 'hidden',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  },
  claseCardTop: {
    display: 'flex', alignItems: 'flex-start', gap: '0.9rem',
    padding: '1.1rem 1.2rem 0.8rem', cursor: 'pointer',
  },
  claseCardIcon:   { fontSize: '1.6rem', flexShrink: 0, marginTop: '0.1rem' },
  claseCardNombre: { fontWeight: 800, color: '#023052', fontSize: '0.98rem', marginBottom: '0.2rem' },
  claseCardDesc:   { fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 },
  claseCardFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.65rem 1.2rem', borderTop: '1px solid #e2e8f0',
    background: 'white',
  },
  claseCardMeta: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#64748b' },
  btnVerClase: {
    background: '#023052', color: 'white', border: 'none',
    borderRadius: 7, padding: '0.28rem 0.75rem',
    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'background 0.18s',
  },

  claseHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: '1.5rem', flexWrap: 'wrap',
  },
  claseNombre: { fontSize: '1.4rem', fontWeight: 800, color: '#023052', marginBottom: '0.3rem' },
  claseDesc:   { fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 },

  docenteBox:    { background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '1rem 1.2rem', minWidth: 200 },
  docenteLabel:  { fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' },
  docenteInfo:   { display: 'flex', alignItems: 'center', gap: '0.7rem' },
  docenteAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docenteNombre: { fontWeight: 700, color: '#023052', fontSize: '0.9rem' },
  docenteUser:   { fontSize: '0.78rem', color: '#94a3b8' },
}

const m = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(2,48,82,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.18s ease', backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'white', borderRadius: 18,
    width: '100%', maxWidth: 440, margin: '1rem',
    boxShadow: '0 24px 64px rgba(2,48,82,0.22)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.5rem 1.6rem 1.2rem',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)', flexShrink: 0,
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
  body:   { padding: '1.6rem', overflowY: 'auto' },
  grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.8rem' },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
