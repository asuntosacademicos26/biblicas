import { useEffect, useState } from 'react'
import { ref, onValue, push, set, remove, update, get } from 'firebase/database'
import { db } from '../config/firebase'

const POR_PAGINA = 15

export default function ClasesBiblicas() {
  const [clases,       setClases]       = useState(null)
  const [docentes,     setDocentes]     = useState([])
  const [claseActiva,  setClaseActiva]  = useState(null)
  const [modalCrear,   setModalCrear]   = useState(false)
  const [modalAlumno,  setModalAlumno]  = useState(false)
  const [busqueda,     setBusqueda]     = useState('')
  const [pagina,       setPagina]       = useState(1)
  const [vista,        setVista]        = useState('tabla') // 'tabla' | 'grid'

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
  const filtradas = clases?.filter(c => {
    const q = busqueda.toLowerCase()
    const docente = docentes.find(d => d.id === c.docenteId)
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q) ||
      (docente?.nombreCompleto || docente?.username || '').toLowerCase().includes(q)
    )
  }) ?? []

  const totalPaginas  = Math.ceil(filtradas.length / POR_PAGINA)
  const paginaActual  = Math.min(pagina, totalPaginas || 1)
  const inicio        = (paginaActual - 1) * POR_PAGINA
  const paginadas     = filtradas.slice(inicio, inicio + POR_PAGINA)

  return (
    <>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Clases Bíblicas
            {clases && clases.length > 0 && (
              <span style={s.countBadge}>{clases.length}</span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              style={{ ...s.vistaBtn, ...(vista === 'tabla' ? s.vistaBtnActivo : {}) }}
              onClick={() => setVista('tabla')} title="Vista lista"
            ><IconLista /></button>
            <button
              style={{ ...s.vistaBtn, ...(vista === 'grid' ? s.vistaBtnActivo : {}) }}
              onClick={() => setVista('grid')} title="Vista cuadrícula"
            ><IconGrid /></button>
            <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalCrear(true)}>
              + Crear clase
            </button>
          </div>
        </div>

        {/* Buscador */}
        {clases && clases.length > 0 && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre, descripción o docente…"
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            />
          </div>
        )}

        {clases === null && <p className="empty-msg">Cargando…</p>}
        {clases?.length === 0 && <p className="empty-msg">No hay clases creadas aún.</p>}
        {clases && clases.length > 0 && filtradas.length === 0 && (
          <p className="empty-msg">Sin resultados para "{busqueda}".</p>
        )}

        {/* Vista tabla */}
        {vista === 'tabla' && paginadas.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Nombre de la clase</th>
                  <th>Facultad / Escuela</th>
                  <th>Docente</th>
                  <th style={{ textAlign: 'center' }}>Alumnos</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginadas.map((c, i) => {
                  const docente = docentes.find(d => d.id === c.docenteId)
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }}>
                      <td style={{ color: '#94a3b8' }}>{inicio + i + 1}</td>
                      <td onClick={() => setClaseActiva(c)}>
                        <div style={{ fontWeight: 700, color: '#023052' }}>{c.nombre}</div>
                        {c.descripcion && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{c.descripcion}</div>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {c.facultad
                          ? <><div style={{ color: '#023052', fontWeight: 600 }}>{c.facultad}</div>{c.escuela && <div style={{ color: '#94a3b8' }}>{c.escuela}</div>}</>
                          : <span style={{ color: '#cbd5e1' }}>—</span>}
                        {c.lugar && <div style={{ color: '#166534', fontSize: '0.75rem', marginTop: 2 }}>📍 {c.lugar}</div>}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.86rem' }}>
                        {docente ? (docente.nombreCompleto || docente.username) : <span style={{ color: '#cbd5e1' }}>Sin asignar</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={s.alumnosBadge}>{c.alumnos.length}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button style={s.btnVerSm} onClick={() => setClaseActiva(c)}>Ver →</button>
                          <button
                            className="btn-danger-outline"
                            style={{ fontSize: '0.76rem', padding: '0.22rem 0.55rem' }}
                            onClick={() => eliminarClase(c.id, c.nombre)}
                          >Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista grid */}
        {vista === 'grid' && paginadas.length > 0 && (
          <div style={s.clasesGrid}>
            {paginadas.map(c => {
              const docente = docentes.find(d => d.id === c.docenteId)
              return (
                <ClaseCard
                  key={c.id} clase={c} docente={docente}
                  onClick={() => setClaseActiva(c)}
                  onEliminar={() => eliminarClase(c.id, c.nombre)}
                />
              )
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div style={s.pagination}>
            <button style={s.pageBtn} disabled={paginaActual === 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{ ...s.pageBtn, ...(n === paginaActual ? s.pageBtnActivo : {}) }}
                onClick={() => setPagina(n)}
              >{n}</button>
            ))}
            <button style={s.pageBtn} disabled={paginaActual === totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
            <span style={s.pageInfo}>{inicio + 1}–{Math.min(inicio + POR_PAGINA, filtradas.length)} de {filtradas.length}</span>
          </div>
        )}
      </div>

      {modalCrear && (
        <ModalCrearClase docentes={docentes} onClose={() => setModalCrear(false)} />
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
          {clase.facultad && (
            <span style={s.metaItem}>
              <IconFacultad /> {clase.escuela || clase.facultad}
            </span>
          )}
          {clase.lugar && (
            <span style={s.metaItem}>
              <IconPin /> {clase.lugar}
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
  const [facultad,    setFacultad]    = useState('')
  const [escuela,     setEscuela]     = useState('')
  const [ciclo,       setCiclo]       = useState('')
  const [grupo,       setGrupo]       = useState('')
  const [lugar,       setLugar]       = useState('')
  const [facultades,  setFacultades]  = useState([])
  const [todosAlumnos, setTodosAlumnos] = useState([])
  const [seleccionados, setSeleccionados] = useState({})
  const [estado,      setEstado]      = useState(null)
  const [cargando,    setCargando]    = useState(false)

  const facultadSel = facultades.find(f => f.nombre === facultad)
  const escuelas    = facultadSel?.escuelas || []

  // Alumnos filtrados por facultad + escuela + ciclo (+ grupo si está)
  const alumnosFiltrados = todosAlumnos.filter(a => {
    if (!facultad) return false
    const matchFac = (a.facultad || '') === facultad
    const matchEsc = !escuela || (a.escuelaProfesional || '') === escuela
    const matchCiclo = !ciclo || String(a.ciclo || '') === String(ciclo)
    const matchGrupo = !grupo || String(a.grupo || '') === String(grupo)
    return matchFac && matchEsc && matchCiclo && matchGrupo
  })

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    return onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      setFacultades(Object.values(snap.val()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
    })
  }, [])

  useEffect(() => {
    return onValue(ref(db, 'dataAlumnos'), snap => {
      if (!snap.exists()) { setTodosAlumnos([]); return }
      setTodosAlumnos(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
    })
  }, [])

  // Cuando cambian los filtros, marcar todos por defecto
  useEffect(() => {
    const nuevo = {}
    alumnosFiltrados.forEach(a => { nuevo[a.id] = true })
    setSeleccionados(nuevo)
  }, [facultad, escuela, ciclo, grupo, todosAlumnos])

  function toggleAlumno(id) {
    setSeleccionados(prev => ({ ...prev, [id]: !prev[id] }))
  }
  function toggleTodos(marcar) {
    const nuevo = {}
    alumnosFiltrados.forEach(a => { nuevo[a.id] = marcar })
    setSeleccionados(nuevo)
  }

  const todosChecked = alumnosFiltrados.length > 0 && alumnosFiltrados.every(a => seleccionados[a.id])
  const algunoChecked = alumnosFiltrados.some(a => seleccionados[a.id])

  async function crear(e) {
    e.preventDefault()
    if (!nombre.trim()) return setEstado({ tipo: 'error', msg: 'El nombre de la clase es obligatorio.' })
    setCargando(true)
    setEstado(null)
    try {
      const claseRef = await push(ref(db, 'clases'), {
        nombre:      nombre.trim(),
        descripcion: descripcion.trim(),
        docenteId:   docenteId || null,
        facultad:    facultad || null,
        escuela:     escuela || null,
        ciclo:       ciclo || null,
        grupo:       grupo || null,
        lugar:       lugar.trim() || null,
        creadoEn:    Date.now(),
      })
      // Agregar alumnos seleccionados
      const marcados = alumnosFiltrados.filter(a => seleccionados[a.id])
      for (const a of marcados) {
        await push(ref(db, `clases/${claseRef.key}/alumnos`), {
          nombreCompleto: `${a.nombre} ${a.apellido}`.trim(),
          dni:     a.dni || '',
          correo:  a.correo || '',
          celular: a.celular || '',
          creadoEn: Date.now(),
        })
      }
      onClose()
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al crear la clase.' })
      setCargando(false)
    }
  }

  const mostrarLista = facultad && ciclo

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth: 560 }}>
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

            {/* Datos básicos */}
            <div className="form-group">
              <label>Nombre de la clase <span style={{ color: '#ef4444' }}>*</span></label>
              <input placeholder="Ej: Evangelio de Juan" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea placeholder="Breve descripción…" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ minHeight: 52 }} />
            </div>
            <div className="form-group">
              <label>Docente asignado</label>
              <select value={docenteId} onChange={e => setDocenteId(e.target.value)}>
                <option value="">— Sin asignar —</option>
                {docentes.map(d => <option key={d.id} value={d.id}>{d.nombreCompleto || d.username}</option>)}
              </select>
            </div>

            {/* Ubicación académica */}
            <div style={m.secLabel}><IconFacultad /> Ubicación académica</div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Facultad</label>
                <select value={facultad} onChange={e => { setFacultad(e.target.value); setEscuela(''); setCiclo(''); setGrupo('') }}>
                  <option value="">— Seleccionar —</option>
                  {facultades.map((f, i) => <option key={i} value={f.nombre}>{f.nombre}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Escuela profesional</label>
                <select value={escuela} onChange={e => { setEscuela(e.target.value) }} disabled={!facultad || escuelas.length === 0}>
                  <option value="">{!facultad ? '— Selecciona facultad —' : '— Seleccionar —'}</option>
                  {escuelas.map((e, i) => <option key={i} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div style={{ ...m.grid2, marginTop: '0.9rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Ciclo</label>
                <select value={ciclo} onChange={e => setCiclo(e.target.value)} disabled={!facultad}>
                  <option value="">— Seleccionar —</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}° ciclo</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Grupo <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>(opcional)</span></label>
                <select value={grupo} onChange={e => setGrupo(e.target.value)} disabled={!ciclo}>
                  <option value="">— Todos los grupos —</option>
                  <option value="Único">Único</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Grupo {n}</option>)}
                </select>
              </div>
            </div>

            {/* Lugar */}
            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Lugar <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>(opcional)</span></label>
              <input
                placeholder="Ej: Aula 201 — Pabellón A"
                value={lugar}
                onChange={e => setLugar(e.target.value)}
              />
            </div>

            {/* Lista de alumnos */}
            {mostrarLista && (
              <>
                <div style={{ ...m.secLabel, marginTop: '1.1rem' }}>
                  <IconPersonas />
                  Alumnos encontrados
                  {alumnosFiltrados.length > 0 && (
                    <span style={m.countBadge}>{alumnosFiltrados.filter(a => seleccionados[a.id]).length} / {alumnosFiltrados.length}</span>
                  )}
                </div>

                {alumnosFiltrados.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                    No se encontraron alumnos con estos filtros.
                  </p>
                )}

                {alumnosFiltrados.length > 0 && (
                  <div style={m.alumnosWrap}>
                    {/* Cabecera con seleccionar todos */}
                    <div style={m.alumnoHeaderRow}>
                      <label style={m.checkLabel}>
                        <input
                          type="checkbox"
                          checked={todosChecked}
                          onChange={e => toggleTodos(e.target.checked)}
                          style={{ accentColor: '#023052', width: 15, height: 15 }}
                        />
                        <span style={{ fontWeight: 700, color: '#023052', fontSize: '0.82rem' }}>
                          {todosChecked ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </span>
                      </label>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {alumnosFiltrados.filter(a => seleccionados[a.id]).length} seleccionado(s)
                      </span>
                    </div>
                    {/* Lista */}
                    <div style={m.alumnosList}>
                      {alumnosFiltrados.map(a => (
                        <label key={a.id} style={{ ...m.alumnoRow, background: seleccionados[a.id] ? '#f0f5ff' : 'white' }}>
                          <input
                            type="checkbox"
                            checked={!!seleccionados[a.id]}
                            onChange={() => toggleAlumno(a.id)}
                            style={{ accentColor: '#023052', flexShrink: 0, width: 15, height: 15 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#023052', fontSize: '0.92rem' }}>
                              {a.nombre} {a.apellido}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              {[a.dni && `DNI: ${a.dni}`, a.codigoEstudiante && `Cód: ${a.codigoEstudiante}`].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!mostrarLista && facultad && !ciclo && (
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.8rem', fontStyle: 'italic' }}>
                Selecciona un ciclo para ver los alumnos disponibles.
              </p>
            )}

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Creando…' : `Crear clase${algunoChecked ? ` (${alumnosFiltrados.filter(a => seleccionados[a.id]).length} alumnos)` : ''}`}
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
  const [busq,      setBusq]      = useState('')
  const [alumno,    setAlumno]    = useState(null)   // encontrado en dataAlumnos
  const [noEncon,   setNoEncon]   = useState(false)
  const [buscando,  setBuscando]  = useState(false)
  const [estado,    setEstado]    = useState(null)
  const [cargando,  setCargando]  = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function buscar(e) {
    e.preventDefault()
    const q = busq.trim()
    if (!q) return
    setBuscando(true)
    setAlumno(null)
    setNoEncon(false)
    setEstado(null)
    try {
      const [snapData, snapClase] = await Promise.all([
        get(ref(db, 'dataAlumnos')),
        get(ref(db, `clases/${claseId}/alumnos`)),
      ])
      if (!snapData.exists()) { setNoEncon(true); return }
      const encontrado = Object.entries(snapData.val()).find(([, d]) =>
        (d.dni || '') === q || (d.codigoEstudiante || '') === q
      )
      if (!encontrado) { setNoEncon(true); return }
      const alumnoData = { id: encontrado[0], ...encontrado[1] }
      // Verificar si ya está matriculado
      if (snapClase.exists()) {
        const yaMatriculado = Object.values(snapClase.val()).some(a =>
          (alumnoData.dni && a.dni === alumnoData.dni) ||
          (alumnoData.codigoEstudiante && a.codigoEstudiante === alumnoData.codigoEstudiante)
        )
        if (yaMatriculado) {
          setEstado({ tipo: 'error', msg: `${alumnoData.nombre} ${alumnoData.apellido} ya está matriculado en esta clase.` })
          return
        }
      }
      setAlumno(alumnoData)
    } finally {
      setBuscando(false)
    }
  }

  async function agregar(e) {
    e.preventDefault()
    if (!alumno) return
    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, `clases/${claseId}/alumnos`), {
        nombreCompleto:   `${alumno.nombre || ''} ${alumno.apellido || ''}`.trim(),
        dni:              alumno.dni || '',
        codigoEstudiante: alumno.codigoEstudiante || '',
        correo:           alumno.correo || '',
        celular:          alumno.celular || '',
        creadoEn:         Date.now(),
      })
      setEstado({ tipo: 'success', msg: `Alumno "${alumno.nombre} ${alumno.apellido}" agregado correctamente.` })
      setBusq('')
      setAlumno(null)
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
            <p style={m.subtitle}>Busca por DNI o código de estudiante</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          {/* Buscador */}
          <form onSubmit={buscar}>
            <div className="form-group">
              <label>DNI o Código de estudiante <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  placeholder="Ej: 12345678 o E-2024-001"
                  value={busq}
                  onChange={e => { setBusq(e.target.value); setAlumno(null); setNoEncon(false) }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} disabled={buscando || !busq.trim()}>
                  {buscando ? '…' : 'Buscar'}
                </button>
              </div>
            </div>
          </form>

          {/* Sin resultados */}
          {noEncon && (
            <div style={m.noEncon}>
              No se encontró ningún alumno con ese DNI o código en Data Alumnos.
            </div>
          )}

          {/* Tarjeta del alumno encontrado */}
          {alumno && (
            <form onSubmit={agregar}>
              <div style={m.alumnoCard}>
                <div style={m.alumnoCardTop}>
                  <div style={m.alumnoAvatar}>
                    {`${alumno.nombre || ''}`.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={m.alumnoCardNombre}>{alumno.nombre} {alumno.apellido}</div>
                    <div style={m.alumnoCardMeta}>
                      {[alumno.dni && `DNI: ${alumno.dni}`, alumno.codigoEstudiante && `Cód: ${alumno.codigoEstudiante}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
                {(alumno.escuelaProfesional || alumno.facultad || alumno.ciclo) && (
                  <div style={m.alumnoCardInfo}>
                    {[alumno.facultad, alumno.escuelaProfesional, alumno.ciclo && `Ciclo ${alumno.ciclo}`].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <div style={m.footer}>
                <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
                <button className="btn btn-success" disabled={cargando}>
                  {cargando ? 'Agregando…' : 'Agregar a la clase'}
                </button>
              </div>
            </form>
          )}

          {!alumno && !noEncon && (
            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Iconos ── */
function IconFacultad() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconLista() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function IconGrid() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IconPersonas() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconDocente() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconPin() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
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

  searchWrap:  { position: 'relative', marginBottom: '1rem' },
  searchIcon:  { position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  searchInput: { paddingLeft: '2.2rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10 },

  vistaBtn: {
    width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#64748b', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  vistaBtnActivo: { background: '#023052', color: 'white', borderColor: '#023052' },

  alumnosBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#e0eaf3', color: '#023052', borderRadius: 99,
    fontSize: '0.75rem', fontWeight: 700, padding: '0.1rem 0.6rem',
  },
  btnVerSm: {
    background: '#023052', color: 'white', border: 'none',
    borderRadius: 6, padding: '0.22rem 0.6rem',
    fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },

  pagination: { display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: 7, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#023052', fontWeight: 600, fontSize: '0.86rem',
    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActivo: { background: '#023052', color: 'white', borderColor: '#023052' },
  pageInfo: { marginLeft: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' },

  clasesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1rem',
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
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.18s ease',
  },
  modal: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 18, width: '100%', maxWidth: 440, margin: '1rem',
    boxShadow: '0 8px 40px rgba(2,48,82,0.18)',
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
  secLabel: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.75rem', fontWeight: 700, color: '#023052',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    margin: '1.1rem 0 0.7rem', paddingBottom: '0.4rem',
    borderBottom: '1.5px solid #e2e8f0',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.8rem' },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },
  alumnosWrap: {
    border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  alumnoHeaderRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.55rem 0.8rem', background: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0',
  },
  checkLabel: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
  },
  alumnosList: {
    maxHeight: 220, overflowY: 'auto',
  },
  alumnoRow: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.45rem 0.8rem', cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s',
  },
  noEncon: {
    background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10,
    color: '#9a3412', fontSize: '0.84rem', padding: '0.75rem 1rem', marginTop: '0.2rem',
  },
  alumnoCard: {
    border: '1.5px solid #bbf7d0', borderRadius: 12,
    background: '#f0fdf4', padding: '0.9rem 1rem', marginTop: '0.5rem',
  },
  alumnoCardTop: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  alumnoAvatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  alumnoCardNombre: { fontWeight: 700, color: '#023052', fontSize: '0.95rem' },
  alumnoCardMeta:   { fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' },
  alumnoCardInfo: {
    fontSize: '0.76rem', color: '#166534', marginTop: '0.55rem',
    paddingTop: '0.5rem', borderTop: '1px solid #bbf7d0',
  },
}
