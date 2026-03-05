import { useEffect, useState } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { db } from '../config/firebase'

export default function DataAlumnos() {
  const [alumnos,    setAlumnos]    = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda,   setBusqueda]   = useState('')

  useEffect(() => {
    return onValue(ref(db, 'dataAlumnos'), snap => {
      if (!snap.exists()) { setAlumnos([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.creadoEn - a.creadoEn)
      setAlumnos(lista)
    })
  }, [])

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar al alumno "${nombre}"?`)) return
    await remove(ref(db, `dataAlumnos/${id}`))
  }

  const filtrados = alumnos?.filter(a => {
    const q = busqueda.toLowerCase()
    return (
      `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
      (a.escuelaProfesional || '').toLowerCase().includes(q) ||
      (a.facultad || '').toLowerCase().includes(q)
    )
  }) ?? []

  return (
    <>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Data de Alumnos
            {alumnos && alumnos.length > 0 && (
              <span style={s.countBadge}>{alumnos.length}</span>
            )}
          </h3>
          <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalAbierto(true)}>
            + Agregar alumno
          </button>
        </div>

        {/* Buscador */}
        {alumnos && alumnos.length > 0 && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre, escuela o facultad…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {alumnos === null && <p className="empty-msg">Cargando…</p>}
        {alumnos?.length === 0 && <p className="empty-msg">No hay alumnos registrados aún.</p>}

        {alumnos && alumnos.length > 0 && filtrados.length === 0 && (
          <p className="empty-msg">No se encontraron resultados para "{busqueda}".</p>
        )}

        {filtrados.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre completo</th>
                  <th>Escuela profesional</th>
                  <th>Facultad</th>
                  <th>Ciclo</th>
                  <th>Grupo</th>
                  <th>F. Nacimiento</th>
                  <th>Correo</th>
                  <th>Celular</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: '#94a3b8', width: 36 }}>{i + 1}</td>
                    <td>
                      <div style={s.nombreCell}>
                        <div style={s.avatar}>
                          {a.nombre.charAt(0).toUpperCase()}{a.apellido.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: '#023052' }}>{a.nombre} {a.apellido}</strong>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#475569' }}>{a.escuelaProfesional || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.facultad || '—'}</td>
                    <td style={{ color: '#475569', textAlign: 'center' }}>{a.ciclo || '—'}</td>
                    <td style={{ color: '#475569', textAlign: 'center' }}>{a.grupo || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.fechaNacimiento || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.correo || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.celular || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-danger-outline"
                        onClick={() => eliminar(a.id, `${a.nombre} ${a.apellido}`)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ModalAgregarAlumno onClose={() => setModalAbierto(false)} />
      )}
    </>
  )
}

/* ── Modal agregar alumno ── */
function ModalAgregarAlumno({ onClose }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', escuelaProfesional: '', facultad: '',
    ciclo: '', grupo: '', fechaNacimiento: '', correo: '', celular: '',
  })
  const [facultades, setFacultades] = useState([])
  const [estado,     setEstado]     = useState(null)
  const [cargando,   setCargando]   = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Escuelas de la facultad seleccionada
  const facultadSeleccionada = facultades.find(f => f.nombre === form.facultad)
  const escuelas = facultadSeleccionada?.escuelas || []

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Cargar facultades desde Firebase
  useEffect(() => {
    return onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      setFacultades(Object.values(snap.val()))
    })
  }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim())
      return setEstado({ tipo: 'error', msg: 'Nombre y apellido son obligatorios.' })

    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, 'dataAlumnos'), { ...form, creadoEn: Date.now() })
      setEstado({ tipo: 'success', msg: `Alumno "${form.nombre} ${form.apellido}" registrado.` })
      setForm({ nombre: '', apellido: '', escuelaProfesional: '', facultad: '', ciclo: '', grupo: '', fechaNacimiento: '', correo: '', celular: '' })
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar el alumno.' })
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
            <p style={m.subtitle}>Completa los datos del alumno</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={guardar}>

            {/* Sección datos personales */}
            <div style={m.seccionLabel}><IconPersona /> Datos personales</div>
            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Nombre <Req /></label>
                <input placeholder="Juan" value={form.nombre} onChange={set_('nombre')} autoFocus />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Apellido <Req /></label>
                <input placeholder="Pérez" value={form.apellido} onChange={set_('apellido')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Fecha de nacimiento</label>
                <input type="date" value={form.fechaNacimiento} onChange={set_('fechaNacimiento')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Celular</label>
                <input placeholder="987654321" value={form.celular} onChange={set_('celular')} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Correo electrónico</label>
              <input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={set_('correo')} />
            </div>

            {/* Sección datos académicos */}
            <div style={{ ...m.seccionLabel, marginTop: '1.2rem' }}><IconAcademico /> Datos académicos</div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Facultad</label>
              <select
                value={form.facultad}
                onChange={e => setForm(f => ({ ...f, facultad: e.target.value, escuelaProfesional: '' }))}
              >
                <option value="">— Seleccionar facultad —</option>
                {facultades.map((f, i) => (
                  <option key={i} value={f.nombre}>{f.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Escuela profesional</label>
              <select
                value={form.escuelaProfesional}
                onChange={set_('escuelaProfesional')}
                disabled={!form.facultad || escuelas.length === 0}
              >
                <option value="">
                  {!form.facultad ? '— Selecciona una facultad primero —' : escuelas.length === 0 ? '— Sin escuelas registradas —' : '— Seleccionar escuela —'}
                </option>
                {escuelas.map((e, i) => (
                  <option key={i} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Ciclo</label>
                <select value={form.ciclo} onChange={set_('ciclo')}>
                  <option value="">— Seleccionar —</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}° ciclo</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Grupo</label>
                <select value={form.grupo} onChange={set_('grupo')}>
                  <option value="">— Seleccionar —</option>
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>Grupo {n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Agregar alumno'}
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
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconPersona() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconAcademico() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}

/* ── Estilos ── */
const s = {
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  btnSm:      { padding: '0.45rem 1.1rem', fontSize: '0.86rem' },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },
  searchWrap: {
    position: 'relative', marginBottom: '1rem',
  },
  searchIcon: {
    position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)',
    display: 'flex', pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '2.2rem', background: '#f8fafc',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
  },
  nombreCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  avatar: {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.78rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

const m = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(2,48,82,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.18s ease', backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'white', borderRadius: 18,
    width: '100%', maxWidth: 500, margin: '1rem',
    boxShadow: '0 24px 64px rgba(2,48,82,0.22)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
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
  body:  { padding: '1.6rem', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  seccionLabel: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.78rem', fontWeight: 700, color: '#023052',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '0.8rem', paddingBottom: '0.5rem',
    borderBottom: '1.5px solid #e2e8f0',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
