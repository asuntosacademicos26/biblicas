import { useEffect, useState } from 'react'
import { ref, onValue, push, set, remove, get } from 'firebase/database'
import { db } from '../config/firebase'

const hoy = () => new Date().toISOString().slice(0, 10)

export default function MisClases({ docenteId }) {
  const [clases,      setClases]      = useState(null)
  const [claseActiva, setClaseActiva] = useState(null)
  const [dataAlumnos, setDataAlumnos] = useState([])

  useEffect(() => {
    return onValue(ref(db, 'clases'), snap => {
      if (!snap.exists()) { setClases([]); return }
      const lista = Object.entries(snap.val())
        .filter(([, d]) => d.docenteId === docenteId)
        .map(([id, d]) => ({
          id, ...d,
          alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
        }))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      setClases(lista)
      if (claseActiva) {
        const act = lista.find(c => c.id === claseActiva.id)
        if (act) setClaseActiva(act)
      }
    })
  }, [docenteId])

  useEffect(() => {
    return onValue(ref(db, 'dataAlumnos'), snap => {
      if (!snap.exists()) { setDataAlumnos([]); return }
      setDataAlumnos(Object.values(snap.val()))
    })
  }, [])

  // ── Vista detalle ──
  if (claseActiva) {
    return (
      <DetalleClase
        clase={claseActiva}
        docenteId={docenteId}
        dataAlumnos={dataAlumnos}
        onVolver={() => setClaseActiva(null)}
      />
    )
  }

  // ── Vista principal ──
  return (
    <div>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Mis Clases Bíblicas
            {clases !== null && clases.length > 0 && (
              <span style={s.badge}>{clases.length}</span>
            )}
          </h3>
        </div>

        {clases === null && <p className="empty-msg">Cargando…</p>}
        {clases?.length === 0 && (
          <div style={s.sinClasesBox}>
            <div style={s.sinClasesIcon}>📖</div>
            <div style={s.sinClasesTitle}>No tienes clases asignadas</div>
            <div style={s.sinClasesDesc}>El administrador aún no te ha asignado ninguna clase bíblica.</div>
          </div>
        )}

        {clases && clases.length > 0 && (
          <div style={s.lista}>
            {clases.map(c => (
              <div key={c.id} style={s.claseRow} onClick={() => setClaseActiva(c)}>
                <div style={s.claseRowIcon}>📖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.claseRowNombre}>{c.nombre}</div>
                  <div style={s.claseRowMeta}>
                    {[c.facultad, c.escuela && `› ${c.escuela}`, c.ciclo && `Ciclo ${c.ciclo}`, c.grupo && `Grupo ${c.grupo}`, c.lugar && `📍 ${c.lugar}`].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={s.claseRowRight}>
                  <div style={s.countCol}>
                    <span style={s.countNum}>{c.alumnosCount}</span>
                    <span style={s.countLabel}>alumno{c.alumnosCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span style={s.arrow}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección lecciones */}
      <LeccionesSection docenteId={docenteId} />

      {/* Sección cumpleaños */}
      <CumpleanosSection clases={clases ?? []} dataAlumnos={dataAlumnos} />
    </div>
  )
}

/* ── Sección lecciones ── */
function LeccionesSection({ docenteId }) {
  const [lecciones,       setLecciones]       = useState([])
  const [leccionActualId, setLeccionActualId] = useState(null)
  const [guardando,       setGuardando]       = useState(false)
  const [pendiente,       setPendiente]       = useState(null) // leccion a confirmar

  useEffect(() => {
    return onValue(ref(db, 'leccionesBiblicas'), snap => {
      if (!snap.exists()) { setLecciones([]); return }
      setLecciones(
        Object.entries(snap.val())
          .map(([id, d]) => ({ id, ...d }))
          .sort((a, b) => (a.numero || 0) - (b.numero || 0))
      )
    })
  }, [])

  useEffect(() => {
    return onValue(ref(db, `usuarios/${docenteId}/leccionActualId`), snap => {
      setLeccionActualId(snap.exists() ? snap.val() : null)
    })
  }, [docenteId])

  function intentarSeleccionar(leccion) {
    if (guardando || leccion.id === leccionActualId) return
    setPendiente(leccion)
  }

  async function confirmarCambio() {
    if (!pendiente || guardando) return
    setGuardando(true)
    await set(ref(db, `usuarios/${docenteId}/leccionActualId`), pendiente.id)
    setGuardando(false)
    setPendiente(null)
  }

  if (lecciones.length === 0) return null

  const leccionActual = lecciones.find(l => l.id === leccionActualId)

  return (
    <>
      <div className="card" style={{ marginTop: '1.2rem' }}>
        <div style={s.cardHeader}>
          <div>
            <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
              📘 Lecciones Bíblicas
              <span style={s.badge}>{lecciones.length}</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Selecciona la lección en la que estás
            </p>
          </div>
          {leccionActual && (
            <div style={s.lecActualChip}>
              En lección {leccionActual.numero}: <strong>{leccionActual.titulo}</strong>
            </div>
          )}
        </div>

        <div style={s.leccionesLista}>
          {lecciones.map(l => {
            const activa = l.id === leccionActualId
            return (
              <div
                key={l.id}
                style={{ ...s.leccionRow, ...(activa ? s.leccionRowActiva : {}) }}
                onClick={() => intentarSeleccionar(l)}
              >
                <div style={{ ...s.leccionNumCircle, background: activa ? 'linear-gradient(135deg,#023052,#04508a)' : '#e2e8f0', color: activa ? 'white' : '#64748b' }}>
                  {l.numero}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...s.leccionTitulo, fontWeight: activa ? 800 : 600, color: activa ? '#023052' : '#334155' }}>
                    {l.titulo}
                  </div>
                  {l.descripcion && (
                    <div style={s.leccionDesc}>{l.descripcion}</div>
                  )}
                </div>
                {activa && (
                  <div style={s.leccionActivaBadge}>✓ Actual</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {pendiente && (
        <ModalConfirmarLeccion
          actual={leccionActual}
          nueva={pendiente}
          guardando={guardando}
          onConfirmar={confirmarCambio}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </>
  )
}

/* ── Modal confirmación cambio de lección ── */
function ModalConfirmarLeccion({ actual, nueva, guardando, onConfirmar, onCancelar }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancelar])

  return (
    <div style={mc.backdrop} onClick={e => { if (e.target === e.currentTarget) onCancelar() }}>
      <div className="modal-inner" style={mc.modal}>
        <div style={mc.iconWrap}>
          <span style={mc.icon}>📖</span>
        </div>
        <h2 style={mc.title}>¿Cambiar lección bíblica?</h2>
        <p style={mc.desc}>
          Estás a punto de cambiar tu lección activa a:
        </p>
        <div style={mc.nuevaCard}>
          <div style={mc.nuevaNum}>{nueva.numero}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={mc.nuevaTitulo}>{nueva.titulo}</div>
            {nueva.descripcion && <div style={mc.nuevaDesc}>{nueva.descripcion}</div>}
          </div>
        </div>
        {actual && (
          <p style={mc.actualMsg}>
            Lección actual: <strong>{actual.titulo}</strong>
          </p>
        )}
        <div style={mc.acciones}>
          <button style={mc.btnCancelar} onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn btn-primary" style={mc.btnConfirmar} onClick={onConfirmar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Sí, cambiar lección'}
          </button>
        </div>
      </div>
    </div>
  )
}

const mc = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(1,30,53,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem', backdropFilter: 'blur(3px)',
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'white', borderRadius: 20,
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 64px rgba(2,48,82,0.22)',
    padding: '2rem 1.75rem 1.75rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
    animation: 'slideUp 0.2s ease',
  },
  iconWrap: { marginBottom: '0.75rem' },
  icon:     { fontSize: '2.5rem' },
  title:    { fontSize: '1.15rem', fontWeight: 800, color: '#023052', margin: '0 0 0.5rem' },
  desc:     { fontSize: '0.88rem', color: '#64748b', margin: '0 0 1rem' },
  nuevaCard: {
    display: 'flex', alignItems: 'center', gap: '0.85rem',
    background: '#eff6ff', border: '1.5px solid #93c5fd',
    borderRadius: 12, padding: '0.85rem 1rem',
    width: '100%', textAlign: 'left', marginBottom: '0.75rem',
  },
  nuevaNum: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg,#023052,#04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  nuevaTitulo: { fontWeight: 700, color: '#023052', fontSize: '0.95rem' },
  nuevaDesc:   { fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' },
  actualMsg:   { fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1.25rem' },
  acciones:    { display: 'flex', gap: '0.75rem', width: '100%' },
  btnCancelar: {
    flex: 1, padding: '0.6rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnConfirmar: { flex: 1, padding: '0.6rem', borderRadius: 10, fontSize: '0.92rem' },
}

/* ── Sección cumpleaños ── */
function CumpleanosSection({ clases, dataAlumnos }) {
  // Recolectar DNIs y códigos de todos los alumnos de las clases
  const alumnosClases = []
  clases.forEach(c => {
    if (!c.alumnos) return
    Object.values(c.alumnos).forEach(a => {
      alumnosClases.push({ dni: a.dni || '', codigoEstudiante: a.codigoEstudiante || '', nombreCompleto: a.nombreCompleto })
    })
  })

  // Cruzar con dataAlumnos para obtener fechaNacimiento
  const conCumple = []
  const vistos = new Set()
  alumnosClases.forEach(ac => {
    const encontrado = dataAlumnos.find(d =>
      (ac.dni && d.dni === ac.dni) ||
      (ac.codigoEstudiante && d.codigoEstudiante === ac.codigoEstudiante)
    )
    if (!encontrado || !encontrado.fechaNacimiento) return
    const clave = ac.dni || ac.codigoEstudiante || ac.nombreCompleto
    if (vistos.has(clave)) return
    vistos.add(clave)

    const fecha = parsearFechaNac(encontrado.fechaNacimiento)
    if (!fecha) return
    const { mes, dia, diasRestantes } = calcularCumple(fecha)
    conCumple.push({
      nombre: ac.nombreCompleto || `${encontrado.nombre} ${encontrado.apellido}`.trim(),
      mes, dia, diasRestantes,
      fechaStr: `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}`,
    })
  })

  // Solo los que cumplen dentro de 7 días, ordenados por días restantes
  const proximos = conCumple
    .filter(a => a.diasRestantes <= 7)
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  if (proximos.length === 0) return null

  return (
    <div className="card" style={{ marginTop: '1.2rem' }}>
      <div style={s.cardHeader}>
        <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
          🎂 Cumpleaños esta semana
          <span style={s.badge}>{proximos.length}</span>
        </h3>
        <span style={s.proximosBadge}>Próximos 7 días</span>
      </div>

      <div style={s.cumpleLista}>
        {proximos.map((a, i) => {
          const esHoy = a.diasRestantes === 0
          return (
            <div key={i} style={{ ...s.cumpleRow, ...s.cumpleRowDestacado }}>
              <div style={{ ...s.cumpleAvatar, background: esHoy ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                {esHoy ? '🎂' : '🎉'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...s.cumpleNombre, color: '#023052', fontWeight: 800 }}>
                  {a.nombre}
                  {esHoy && <span style={s.hoyChip}>¡Hoy!</span>}
                </div>
                <div style={s.cumpleFecha}>
                  {a.fechaStr}
                  {!esHoy && <span style={s.diasChip}>en {a.diasRestantes} día{a.diasRestantes !== 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div style={s.cumpleDiaNum}>
                <span style={s.cumpleDia}>{String(a.dia).padStart(2,'0')}</span>
                <span style={s.cumpleMes}>{MESES[a.mes - 1]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function parsearFechaNac(val) {
  if (!val) return null
  // Excel serial
  if (typeof val === 'number' || /^\d{5}$/.test(String(val))) {
    const n = Number(val)
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
    return { mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
  }
  // YYYY-MM-DD
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return { mes: parseInt(m[2]), dia: parseInt(m[3]) }
  // DD/MM/YYYY
  const m2 = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2) return { mes: parseInt(m2[2]), dia: parseInt(m2[1]) }
  return null
}

function calcularCumple({ mes, dia }) {
  const hoyDate = new Date()
  const anio    = hoyDate.getFullYear()
  let cumple    = new Date(anio, mes - 1, dia)
  if (cumple < new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate())) {
    cumple = new Date(anio + 1, mes - 1, dia)
  }
  const hoyMid   = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate())
  const diasRestantes = Math.round((cumple - hoyMid) / 86400000)
  return { mes, dia, diasRestantes }
}

/* ── Detalle de clase con tabs ── */
function DetalleClase({ clase, docenteId, dataAlumnos, onVolver }) {
  const [tab,          setTab]          = useState('alumnos') // 'alumnos' | 'asistencia' | 'historial'
  const [alumnos,      setAlumnos]      = useState([])
  const [asistencias,  setAsistencias]  = useState([])
  const [busqueda,     setBusqueda]     = useState('')
  const [modalEditar,  setModalEditar]  = useState(false)

  useEffect(() => {
    return onValue(ref(db, `clases/${clase.id}/alumnos`), snap => {
      if (!snap.exists()) { setAlumnos([]); return }
      setAlumnos(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
    })
  }, [clase.id])

  useEffect(() => {
    return onValue(ref(db, `clases/${clase.id}/asistencias`), snap => {
      if (!snap.exists()) { setAsistencias([]); return }
      setAsistencias(
        Object.entries(snap.val())
          .map(([id, d]) => ({ id, ...d }))
          .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
      )
    })
  }, [clase.id])

  function getEscuela(a) {
    if (a.escuelaProfesional) return a.escuelaProfesional
    const match = dataAlumnos.find(d =>
      (a.dni && d.dni === a.dni) ||
      (a.codigoEstudiante && d.codigoEstudiante === a.codigoEstudiante)
    )
    return match?.escuelaProfesional || '—'
  }

  const q = busqueda.toLowerCase()
  const alumnosFiltrados = alumnos.filter(a =>
    (a.nombreCompleto || '').toLowerCase().includes(q) ||
    (a.dni || '').includes(q) ||
    (a.codigoEstudiante || '').toLowerCase().includes(q)
  )

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <span style={s.breadLink} onClick={onVolver}>Mis clases</span>
        <span style={s.sep}>›</span>
        <span>{clase.nombre}</span>
      </div>

      <div className="card">
        {/* Info clase */}
        <div style={s.claseInfoBar}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.claseNombre}>{clase.nombre}</div>
            {clase.descripcion && <div style={s.claseDesc}>{clase.descripcion}</div>}
            <div style={s.claseMeta}>
              {[clase.facultad, clase.escuela && `› ${clase.escuela}`, clase.ciclo && `Ciclo ${clase.ciclo}`, clase.grupo && `Grupo ${clase.grupo}`, clase.lugar && `📍 ${clase.lugar}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
            <div style={s.alumnosBadgeWrap}>
              <span style={s.alumnosBadgeNum}>{alumnos.length}</span>
              <span style={s.alumnosBadgeLabel}>alumno{alumnos.length !== 1 ? 's' : ''}</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.38rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setModalEditar(true)}
            >
              <IconEditar /> Editar clase
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs} className="tabs-scroll">
          <button style={{ ...s.tab, ...(tab === 'alumnos'    ? s.tabActivo : {}) }} onClick={() => setTab('alumnos')}>
            <IconPersonas /> Alumnos
          </button>
          <button style={{ ...s.tab, ...(tab === 'asistencia' ? s.tabActivo : {}) }} onClick={() => setTab('asistencia')}>
            <IconCheck /> Llamar asistencia
          </button>
          <button style={{ ...s.tab, ...(tab === 'historial'  ? s.tabActivo : {}) }} onClick={() => setTab('historial')}>
            <IconHistorial /> Historial
            {asistencias.length > 0 && <span style={s.tabBadge}>{asistencias.length}</span>}
          </button>
        </div>

        {/* Tab: Alumnos */}
        {tab === 'alumnos' && (
          <>
            {alumnos.length > 0 && (
              <div style={s.searchWrap}>
                <span style={s.searchIcon}><IconSearch /></span>
                <input style={s.searchInput} placeholder="Buscar alumno…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
            )}
            {alumnos.length === 0 && <p className="empty-msg">No hay alumnos inscritos.</p>}
            {alumnos.length > 0 && alumnosFiltrados.length === 0 && <p className="empty-msg">Sin resultados para "{busqueda}".</p>}
            {alumnosFiltrados.length > 0 && (
              <div className="table-scroll">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Nombre completo</th>
                      <th>DNI</th>
                      <th>Escuela profesional</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((a, i) => (
                      <tr key={a.id}>
                        <td style={{ color: '#94a3b8' }}>{i + 1}</td>
                        <td><strong style={{ color: '#023052' }}>{a.nombreCompleto}</strong></td>
                        <td style={{ color: '#475569' }}>{a.dni || '—'}</td>
                        <td style={{ color: '#475569' }}>{getEscuela(a)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab: Llamar asistencia */}
        {tab === 'asistencia' && (
          <LlamarAsistencia claseId={clase.id} docenteId={docenteId} alumnos={alumnos} asistencias={asistencias} />
        )}

        {/* Tab: Historial */}
        {tab === 'historial' && (
          <HistorialAsistencia asistencias={asistencias} />
        )}
      </div>

      {modalEditar && (
        <ModalEditarAlumnos
          clase={clase}
          alumnos={alumnos}
          onClose={() => setModalEditar(false)}
        />
      )}
    </div>
  )
}

/* ── Llamar asistencia ── */
function LlamarAsistencia({ claseId, docenteId, alumnos, asistencias }) {
  const [fecha,         setFecha]         = useState(hoy())
  const [registros,     setRegistros]     = useState({})
  const [guardando,     setGuardando]     = useState(false)
  const [guardado,      setGuardado]      = useState(false)
  const [leccionActual, setLeccionActual] = useState(null)  // objeto leccion del docente
  const [leccionNumero, setLeccionNumero] = useState('')

  // Cargar la leccion actualmente seleccionada por el docente
  useEffect(() => {
    let unsubLeccion = () => {}
    const unsubId = onValue(ref(db, `usuarios/${docenteId}/leccionActualId`), snapId => {
      unsubLeccion()
      if (!snapId.exists()) { setLeccionActual(null); return }
      const lecId = snapId.val()
      unsubLeccion = onValue(ref(db, `leccionesBiblicas/${lecId}`), snapL => {
        setLeccionActual(snapL.exists() ? { id: lecId, ...snapL.val() } : null)
      })
    })
    return () => { unsubId(); unsubLeccion() }
  }, [docenteId])

  // Sesión existente para la fecha seleccionada
  const sesionExistente = asistencias.find(a => a.fecha === fecha) ?? null
  const proximaSesion   = sesionExistente
    ? (sesionExistente.sesion ?? asistencias.findIndex(a => a.fecha === fecha) + 1)
    : asistencias.length + 1
  const esActualizacion = !!sesionExistente

  // Inicializar presentes y lección al cambiar fecha
  useEffect(() => {
    const init = {}
    if (sesionExistente?.registros) {
      alumnos.forEach(a => {
        const r = sesionExistente.registros[a.id]
        init[a.id] = r ? r.presente : true
      })
    } else {
      alumnos.forEach(a => { init[a.id] = true })
    }
    setRegistros(init)
    setGuardado(false)
    setLeccionNumero(sesionExistente?.leccionNumero ?? '')
  }, [alumnos, fecha])

  const totalLecciones = leccionActual?.totalLecciones || 16

  const presentes = alumnos.filter(a => registros[a.id]).length
  const ausentes  = alumnos.length - presentes

  function toggleAlumno(id) {
    setRegistros(prev => ({ ...prev, [id]: !prev[id] }))
  }
  function marcarTodos(valor) {
    const nuevo = {}
    alumnos.forEach(a => { nuevo[a.id] = valor })
    setRegistros(nuevo)
  }

  async function guardar() {
    if (alumnos.length === 0) return
    setGuardando(true)
    const datos = {
      sesion:         Number(proximaSesion) || 1,
      fecha:          fecha || null,
      creadoEn:       sesionExistente?.creadoEn ?? Date.now(),
      actualizadoEn:  Date.now(),
      total:          alumnos.length,
      presentes,
      leccionId:      leccionActual?.id || null,
      leccionTitulo:  leccionActual?.titulo || null,
      leccionNumero:  leccionNumero ? Number(leccionNumero) : null,
      registros:      {},
    }
    alumnos.forEach(a => {
      datos.registros[a.id] = { nombreCompleto: a.nombreCompleto, presente: !!registros[a.id] }
    })
    if (esActualizacion) {
      await set(ref(db, `clases/${claseId}/asistencias/${sesionExistente.id}`), datos)
    } else {
      await push(ref(db, `clases/${claseId}/asistencias`), datos)
    }
    setGuardando(false)
    setGuardado(true)
  }

  if (alumnos.length === 0) {
    return <p className="empty-msg">No hay alumnos inscritos para tomar asistencia.</p>
  }

  return (
    <div style={s.asistenciaWrap}>
      {/* Encabezado sesión */}
      <div style={s.sesionBanner}>
        <div>
          <div style={s.sesionLabel}>Sesión {proximaSesion}</div>
          <div style={s.sesionSub}>
            {esActualizacion ? '↻ Editando asistencia existente para esta fecha' : 'Nueva sesión de asistencia'}
          </div>
        </div>
        <div style={s.statsPills}>
          <span style={s.pillPresente}><IconCheck /> {presentes} presente{presentes !== 1 ? 's' : ''}</span>
          <span style={s.pillAusente}><IconX /> {ausentes} ausente{ausentes !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Selectores: fecha + lección */}
      <div style={s.asistenciaHeader}>
        <div style={s.fechaGroup}>
          <label style={s.fechaLabel}>Fecha de la sesión</label>
          <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setGuardado(false) }} style={s.fechaInput} />
        </div>

        {leccionActual ? (
          <div style={s.fechaGroup}>
            <label style={s.fechaLabel}>Lección N°</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                value={leccionNumero}
                onChange={e => { setLeccionNumero(e.target.value); setGuardado(false) }}
                style={{ ...s.fechaInput, minWidth: 130 }}
              >
                <option value="">— Seleccionar —</option>
                {Array.from({ length: totalLecciones }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>Lección {n}</option>
                ))}
              </select>
              <span style={s.leccionActualChip}>📖 {leccionActual.titulo}</span>
            </div>
          </div>
        ) : (
          <div style={{ ...s.fechaGroup, justifyContent: 'center' }}>
            <span style={s.sinLeccionMsg}>Sin libro seleccionado en pantalla principal</span>
          </div>
        )}
      </div>

      {guardado && (
        <div style={s.alertaGuardado}>
          ✓ Asistencia guardada correctamente.
        </div>
      )}

      {/* Acciones masivas */}
      <div style={s.accionesMasivas}>
        <button style={s.btnMasa} onClick={() => marcarTodos(true)}>Marcar todos presentes</button>
        <button style={s.btnMasa} onClick={() => marcarTodos(false)}>Marcar todos ausentes</button>
      </div>

      {/* Lista */}
      <div style={s.alumnosListaAsist}>
        {alumnos.map((a, i) => {
          const presente = !!registros[a.id]
          return (
            <div
              key={a.id}
              style={{ ...s.alumnoAsistRow, background: presente ? '#f0fdf4' : '#fff7f7', borderColor: presente ? '#bbf7d0' : '#fecaca' }}
              onClick={() => toggleAlumno(a.id)}
            >
              <div style={{ ...s.estadoBtn, background: presente ? '#16a34a' : '#ef4444' }}>
                {presente ? <IconCheck color="white" /> : <IconX color="white" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.alumnoAsistNombre}>{a.nombreCompleto}</div>
                <div style={s.alumnoAsistMeta}>
                  {[a.dni && `DNI: ${a.dni}`, a.codigoEstudiante && `Cód: ${a.codigoEstudiante}`].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ ...s.asistBadge, background: presente ? '#dcfce7' : '#fee2e2', color: presente ? '#166534' : '#991b1b' }}>
                {presente ? 'Presente' : 'Ausente'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <button
          className="btn btn-success"
          style={{ fontSize: '0.95rem', padding: '0.6rem 1.6rem' }}
          onClick={guardar}
          disabled={guardando || guardado}
        >
          {guardando ? 'Guardando…' : guardado ? '✓ Asistencia guardada' : esActualizacion ? 'Actualizar asistencia' : 'Guardar asistencia'}
        </button>
      </div>
    </div>
  )
}

/* ── Historial de asistencias ── */
function HistorialAsistencia({ asistencias }) {
  const [abierto, setAbierto] = useState(null)

  if (asistencias.length === 0) {
    return <p className="empty-msg">No hay registros de asistencia aún.</p>
  }

  const formatFecha = f => {
    if (!f) return '—'
    const [y, m, d] = f.split('-')
    return `${d}/${m}/${y}`
  }

  // Ordenar por sesion ascendente para mostrarlas en orden
  const ordenadas = [...asistencias].sort((a, b) => (a.sesion || 0) - (b.sesion || 0))

  return (
    <div style={s.historialWrap}>
      {ordenadas.map(a => {
        const registros = a.registros ? Object.values(a.registros) : []
        const isOpen = abierto === a.id
        const pct = a.total > 0 ? Math.round((a.presentes / a.total) * 100) : 0

        return (
          <div key={a.id} style={s.historialCard}>
            <div style={s.historialHeader} onClick={() => setAbierto(isOpen ? null : a.id)}>
              <div style={s.historialFechaWrap}>
                <div style={s.historialSesionNum}>{a.sesion ?? '—'}</div>
                <div>
                  <div style={s.historialSesionLabel}>Sesión {a.sesion ?? '—'}</div>
                  {a.fecha && <div style={s.historialFechaSmall}><IconCalendario /> {formatFecha(a.fecha)}</div>}
                  {a.leccionTitulo && (
                    <div style={s.historialLeccionChip}>
                      📖 {a.leccionTitulo}{a.leccionNumero ? ` · Lección ${a.leccionNumero}` : ''}
                    </div>
                  )}
                </div>
              </div>
              <div style={s.historialStats}>
                <div style={s.barraWrap}>
                  <div style={{ ...s.barraFill, width: `${pct}%` }} />
                </div>
                <span style={s.pillPresente}>{a.presentes}/{a.total}</span>
                <span style={{ ...s.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
              </div>
            </div>

            {isOpen && registros.length > 0 && (
              <div style={s.historialDetalle}>
                {registros.map((r, i) => (
                  <div key={i} style={s.historialRow}>
                    <div style={{ ...s.estadoDot, background: r.presente ? '#16a34a' : '#ef4444' }} />
                    <span style={s.historialNombre}>{r.nombreCompleto}</span>
                    <span style={{ ...s.asistBadge, background: r.presente ? '#dcfce7' : '#fee2e2', color: r.presente ? '#166534' : '#991b1b' }}>
                      {r.presente ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Modal editar alumnos de la clase ── */
function ModalEditarAlumnos({ clase, alumnos, onClose }) {
  const [busqLista, setBusqLista] = useState('')
  const [busqAgregar, setBusqAgregar] = useState('')
  const [encontrado,  setEncontrado]  = useState(null)
  const [noEncon,     setNoEncon]     = useState(false)
  const [buscando,    setBuscando]    = useState(false)
  const [estado,      setEstado]      = useState(null)
  const [cargando,    setCargando]    = useState(false)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Filtrar lista actual
  const q = busqLista.toLowerCase()
  const alumnosFiltrados = alumnos.filter(a =>
    (a.nombreCompleto || '').toLowerCase().includes(q) ||
    (a.dni || '').includes(q) ||
    (a.codigoEstudiante || '').toLowerCase().includes(q)
  )

  async function eliminarAlumno(alumnoId, nombre) {
    if (!confirm(`¿Quitar a "${nombre}" de la clase?`)) return
    await remove(ref(db, `clases/${clase.id}/alumnos/${alumnoId}`))
  }

  async function buscarAlumno(e) {
    e.preventDefault()
    const q = busqAgregar.trim()
    if (!q) return
    setBuscando(true)
    setEncontrado(null)
    setNoEncon(false)
    setEstado(null)
    try {
      const snapData = await get(ref(db, 'dataAlumnos'))
      if (!snapData.exists()) { setNoEncon(true); return }
      const found = Object.entries(snapData.val()).find(([, d]) =>
        (d.dni || '') === q || (d.codigoEstudiante || '') === q
      )
      if (!found) { setNoEncon(true); return }
      const alumnoData = { id: found[0], ...found[1] }
      const yaEsta = alumnos.some(a =>
        (alumnoData.dni && a.dni === alumnoData.dni) ||
        (alumnoData.codigoEstudiante && a.codigoEstudiante === alumnoData.codigoEstudiante)
      )
      if (yaEsta) {
        setEstado({ tipo: 'error', msg: `${alumnoData.nombre} ${alumnoData.apellido} ya está en esta clase.` })
        return
      }
      setEncontrado(alumnoData)
    } finally {
      setBuscando(false)
    }
  }

  async function agregarAlumno() {
    if (!encontrado) return
    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, `clases/${clase.id}/alumnos`), {
        nombreCompleto:    `${encontrado.nombre || ''} ${encontrado.apellido || ''}`.trim(),
        dni:               encontrado.dni || '',
        codigoEstudiante:  encontrado.codigoEstudiante || '',
        escuelaProfesional: encontrado.escuelaProfesional || '',
        correo:            encontrado.correo || '',
        celular:           encontrado.celular || '',
        creadoEn:          Date.now(),
      })
      setEstado({ tipo: 'success', msg: `"${encontrado.nombre} ${encontrado.apellido}" agregado correctamente.` })
      setBusqAgregar('')
      setEncontrado(null)
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al agregar el alumno.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-inner" style={m.modal}>

        {/* Header */}
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Editar clase</h2>
            <p style={m.subtitle}>{clase.nombre}</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>

          {/* ── Sección: Lista de alumnos ── */}
          <div style={m.seccion}>
            <div style={m.secHeader}>
              <div style={m.secTitle}>
                <IconPersonas /> Alumnos inscritos
                <span style={m.countChip}>{alumnos.length}</span>
              </div>
              {alumnos.length > 0 && (
                <div style={m.miniSearch}>
                  <span style={m.miniSearchIcon}><IconSearch /></span>
                  <input
                    style={m.miniSearchInput}
                    placeholder="Buscar…"
                    value={busqLista}
                    onChange={e => setBusqLista(e.target.value)}
                  />
                </div>
              )}
            </div>

            {alumnos.length === 0 && (
              <p style={m.emptyMsg}>No hay alumnos inscritos aún.</p>
            )}
            {alumnos.length > 0 && alumnosFiltrados.length === 0 && (
              <p style={m.emptyMsg}>Sin resultados para "{busqLista}".</p>
            )}

            {alumnosFiltrados.length > 0 && (
              <div style={m.alumnosList}>
                {alumnosFiltrados.map((a, i) => (
                  <div key={a.id} style={m.alumnoRow}>
                    <div style={m.alumnoNum}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={m.alumnoNombre}>{a.nombreCompleto}</div>
                      <div style={m.alumnoMeta}>
                        {[a.dni && `DNI: ${a.dni}`, a.codigoEstudiante && `Cód: ${a.codigoEstudiante}`].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <button
                      style={m.btnQuitar}
                      onClick={() => eliminarAlumno(a.id, a.nombreCompleto)}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sección: Agregar alumno ── */}
          <div style={{ ...m.seccion, marginTop: '1.2rem', background: '#f8fafc', borderRadius: 12, padding: '1rem' }}>
            <div style={{ ...m.secTitle, marginBottom: '0.8rem' }}>
              <IconPlus /> Agregar alumno
            </div>

            {estado && <div className={`alert alert-${estado.tipo}`} style={{ marginBottom: '0.75rem' }}>{estado.msg}</div>}

            <form onSubmit={buscarAlumno}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  placeholder="DNI o código de estudiante…"
                  value={busqAgregar}
                  onChange={e => { setBusqAgregar(e.target.value); setEncontrado(null); setNoEncon(false); setEstado(null) }}
                  style={{ flex: 1, fontSize: '0.88rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ flexShrink: 0, fontSize: '0.86rem' }} disabled={buscando || !busqAgregar.trim()}>
                  {buscando ? '…' : 'Buscar'}
                </button>
              </div>
            </form>

            {noEncon && (
              <div style={m.noEncon}>No se encontró ningún alumno con ese DNI o código.</div>
            )}

            {encontrado && (
              <div style={m.encontradoCard}>
                <div style={m.encontradoInfo}>
                  <div style={m.alumnoAvatar}>{(encontrado.nombre || '').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={m.alumnoNombre}>{encontrado.nombre} {encontrado.apellido}</div>
                    <div style={m.alumnoMeta}>
                      {[encontrado.dni && `DNI: ${encontrado.dni}`, encontrado.codigoEstudiante && `Cód: ${encontrado.codigoEstudiante}`].filter(Boolean).join(' · ')}
                    </div>
                    {(encontrado.facultad || encontrado.escuelaProfesional) && (
                      <div style={{ ...m.alumnoMeta, marginTop: '0.15rem' }}>
                        {[encontrado.facultad, encontrado.escuelaProfesional].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-success"
                  style={{ fontSize: '0.86rem', padding: '0.45rem 1.1rem', marginTop: '0.75rem', width: '100%' }}
                  onClick={agregarAlumno}
                  disabled={cargando}
                >
                  {cargando ? 'Agregando…' : '+ Agregar a la clase'}
                </button>
              </div>
            )}
          </div>

        </div>

        <div style={m.modalFooter}>
          <button style={m.btnCerrar} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

const m = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(1,30,53,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem', backdropFilter: 'blur(2px)',
    animation: 'fadeIn 0.15s ease',
  },
  modal: {
    background: 'white', borderRadius: 18,
    width: '100%', maxWidth: 640,
    boxShadow: '0 24px 64px rgba(2,48,82,0.22)',
    display: 'flex', flexDirection: 'column',
    animation: 'slideUp 0.2s ease',
    maxHeight: '90vh', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '1.4rem 1.5rem 0', flexShrink: 0,
  },
  title:    { fontSize: '1.15rem', fontWeight: 800, color: '#023052', margin: 0 },
  subtitle: { fontSize: '0.83rem', color: '#94a3b8', marginTop: '0.2rem' },
  closeBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: 8,
    width: 32, height: 32, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.9rem', color: '#64748b',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  body: { padding: '1.2rem 1.5rem', overflowY: 'auto', flex: 1 },
  modalFooter: {
    padding: '0.9rem 1.5rem', borderTop: '1px solid #e2e8f0',
    display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
  },
  btnCerrar: {
    padding: '0.5rem 1.4rem', borderRadius: 8,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.9rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },

  seccion: {},
  secHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.75rem', flexWrap: 'wrap' },
  secTitle: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#023052', fontSize: '0.93rem' },
  countChip: {
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem',
  },

  miniSearch: { position: 'relative', minWidth: 160 },
  miniSearchIcon: { position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  miniSearchInput: {
    paddingLeft: '2rem', padding: '0.4rem 0.75rem 0.4rem 2rem',
    border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem',
    width: '100%', background: 'white',
  },

  emptyMsg: { color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', fontStyle: 'italic' },

  alumnosList: {
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
    maxHeight: 260, overflowY: 'auto',
    border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.4rem',
  },
  alumnoRow: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.55rem 0.75rem', borderRadius: 8,
    background: 'white', border: '1px solid #f1f5f9',
  },
  alumnoNum: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#e2e8f0', color: '#64748b',
    fontSize: '0.72rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  alumnoNombre: { fontWeight: 600, color: '#023052', fontSize: '0.9rem' },
  alumnoMeta:   { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' },
  btnQuitar: {
    background: '#fee2e2', color: '#991b1b', border: 'none',
    borderRadius: 6, padding: '0.28rem 0.7rem',
    fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', flexShrink: 0, transition: 'background 0.15s',
  },

  noEncon: {
    background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10,
    color: '#9a3412', fontSize: '0.83rem', padding: '0.6rem 0.9rem', marginTop: '0.6rem',
  },
  encontradoCard: {
    border: '1.5px solid #bbf7d0', borderRadius: 10,
    padding: '0.85rem', marginTop: '0.75rem', background: '#f0fdf4',
  },
  encontradoInfo: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  alumnoAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.95rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
}

/* ── Iconos ── */
function IconEditar() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IconPlus() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconPersonas() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconCheck({ color }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function IconX({ color }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IconHistorial() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconCalendario() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}

/* ── Estilos ── */
const s = {
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' },
  badge: { display: 'inline-flex', alignItems: 'center', background: '#ccdce8', color: '#023052', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem' },

  lista: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  claseRow: { display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: 12, background: 'white', cursor: 'pointer' },
  claseRowIcon:   { fontSize: '1.4rem', flexShrink: 0 },
  claseRowNombre: { fontWeight: 700, color: '#023052', fontSize: '0.98rem' },
  claseRowMeta:   { fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' },
  claseRowRight:  { display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 },
  countCol:       { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  countNum:       { background: '#023052', color: 'white', borderRadius: 99, fontSize: '1rem', fontWeight: 800, padding: '0.1rem 0.65rem', lineHeight: 1.4 },
  countLabel:     { fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: '0.05rem' },
  arrow:          { fontSize: '1rem', color: '#94a3b8', fontWeight: 700 },

  // Lecciones
  lecActualChip: {
    background: '#e0f2fe', color: '#0369a1', borderRadius: 10,
    fontSize: '0.78rem', fontWeight: 600, padding: '0.4rem 0.8rem',
    maxWidth: 280, textAlign: 'right', lineHeight: 1.4,
  },
  leccionesLista: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  leccionRow: {
    display: 'flex', alignItems: 'center', gap: '0.85rem',
    padding: '0.65rem 0.9rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  leccionRowActiva: { border: '1.5px solid #93c5fd', background: '#eff6ff' },
  leccionNumCircle: {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
    fontWeight: 800, fontSize: '0.85rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
  },
  leccionTitulo:     { fontSize: '0.92rem', marginBottom: '0.1rem' },
  leccionDesc:       { fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.1rem', lineHeight: 1.4 },
  leccionActivaBadge:{ background: '#023052', color: 'white', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.7rem', flexShrink: 0 },

  proximosBadge: { background: '#7c3aed', color: 'white', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.8rem' },

  cumpleLista: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  cumpleRow: {
    display: 'flex', alignItems: 'center', gap: '0.85rem',
    padding: '0.65rem 0.9rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
  },
  cumpleRowDestacado: {
    border: '1.5px solid #ddd6fe', background: '#faf5ff',
  },
  cumpleAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    color: 'white', fontWeight: 800, fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cumpleNombre: { fontSize: '0.92rem', marginBottom: '0.1rem' },
  cumpleFecha:  { fontSize: '0.76rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  hoyChip:   { background: '#fef3c7', color: '#92400e', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, padding: '0.05rem 0.5rem', marginLeft: '0.4rem' },
  diasChip:  { background: '#ede9fe', color: '#5b21b6', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, padding: '0.05rem 0.45rem' },
  cumpleDiaNum: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 36 },
  cumpleDia:    { fontWeight: 800, color: '#023052', fontSize: '1.1rem', lineHeight: 1 },
  cumpleMes:    { fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },

  sinClasesBox:   { textAlign: 'center', padding: '3rem 1rem' },
  sinClasesIcon:  { fontSize: '2.5rem', marginBottom: '0.75rem' },
  sinClasesTitle: { fontWeight: 700, color: '#023052', fontSize: '1rem', marginBottom: '0.4rem' },
  sinClasesDesc:  { fontSize: '0.86rem', color: '#94a3b8' },

  breadcrumb: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#64748b' },
  breadLink:  { cursor: 'pointer', color: '#023052', fontWeight: 700, textDecoration: 'underline' },
  sep:        { opacity: 0.4 },

  claseInfoBar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' },
  claseNombre:  { fontWeight: 800, color: '#023052', fontSize: '1.2rem' },
  claseDesc:    { fontSize: '0.88rem', color: '#64748b', marginTop: '0.3rem' },
  claseMeta:    { fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem' },
  alumnosBadgeWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem', flexShrink: 0 },
  alumnosBadgeNum:   { background: '#023052', color: 'white', borderRadius: 99, fontSize: '1.3rem', fontWeight: 800, padding: '0.15rem 0.8rem', lineHeight: 1.4 },
  alumnosBadgeLabel: { fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 },

  // Tabs
  tabs: { display: 'flex', gap: '0.4rem', marginBottom: '1.2rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' },
  tab: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.55rem 1rem', borderRadius: '8px 8px 0 0',
    border: 'none', background: 'transparent', color: '#64748b',
    fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'inherit',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
    transition: 'color 0.15s',
  },
  tabActivo: { color: '#023052', borderBottom: '2px solid #023052', background: '#f8fafc' },
  tabBadge:  { background: '#023052', color: 'white', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, padding: '0.05rem 0.4rem', marginLeft: '0.2rem' },

  searchWrap:  { position: 'relative', marginBottom: '1rem' },
  searchIcon:  { position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  searchInput: { paddingLeft: '2.2rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10 },

  // Asistencia
  asistenciaWrap: { paddingTop: '0.5rem' },
  sesionBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '1rem', flexWrap: 'wrap',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)',
    borderRadius: 12, padding: '0.9rem 1.2rem', marginBottom: '1rem',
  },
  sesionLabel: { fontSize: '1.1rem', fontWeight: 800, color: 'white' },
  sesionSub:   { fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.1rem' },
  asistenciaHeader: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
  fechaGroup:  { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  fechaLabel:  { fontSize: '0.78rem', fontWeight: 700, color: '#023052' },
  fechaInput:  { padding: '0.45rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit' },
  leccionActualChip: { background: '#e0f2fe', color: '#0369a1', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' },
  sinLeccionMsg: { fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.2rem' },
  statsPills:  { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  pillPresente:{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#dcfce7', color: '#166534', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.75rem' },
  pillAusente: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#fee2e2', color: '#991b1b', borderRadius: 99, fontSize: '0.8rem', fontWeight: 700, padding: '0.25rem 0.75rem' },
  alertaYaExiste: { background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, color: '#9a3412', fontSize: '0.83rem', padding: '0.65rem 1rem', marginBottom: '0.8rem' },
  alertaGuardado: { background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, color: '#166534', fontSize: '0.83rem', fontWeight: 600, padding: '0.65rem 1rem', marginBottom: '0.8rem' },
  accionesMasivas: { display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' },
  btnMasa: { padding: '0.35rem 0.9rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: '#023052', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' },
  alumnosListaAsist: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  alumnoAsistRow: { display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.65rem 0.9rem', borderRadius: 10, border: '1.5px solid', cursor: 'pointer', transition: 'background 0.15s' },
  estadoBtn:     { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alumnoAsistNombre: { fontWeight: 600, color: '#023052', fontSize: '0.9rem' },
  alumnoAsistMeta:   { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' },
  asistBadge: { fontSize: '0.75rem', fontWeight: 700, borderRadius: 99, padding: '0.2rem 0.65rem', flexShrink: 0 },

  // Historial
  historialWrap: { display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' },
  historialCard: { border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: 'white' },
  historialHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', cursor: 'pointer', gap: '1rem' },
  historialFechaWrap:   { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  historialSesionNum:   { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #023052, #04508a)', color: 'white', fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  historialSesionLabel: { fontWeight: 700, color: '#023052', fontSize: '0.92rem' },
  historialFechaSmall:  { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' },
  historialLeccionChip: { fontSize: '0.74rem', color: '#0369a1', background: '#e0f2fe', borderRadius: 99, padding: '0.1rem 0.6rem', marginTop: '0.25rem', display: 'inline-block', fontWeight: 600 },
  historialStats: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  barraWrap: { width: 80, height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' },
  barraFill: { height: '100%', background: '#16a34a', borderRadius: 99, transition: 'width 0.3s' },
  chevron:   { fontSize: '1rem', color: '#94a3b8', transition: 'transform 0.2s', userSelect: 'none' },
  historialDetalle: { borderTop: '1px solid #f1f5f9', background: '#fafbfc' },
  historialRow:     { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem 0.5rem 1.2rem', borderBottom: '1px solid #f1f5f9' },
  estadoDot:        { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  historialNombre:  { flex: 1, fontSize: '0.86rem', color: '#023052', fontWeight: 500 },
}
