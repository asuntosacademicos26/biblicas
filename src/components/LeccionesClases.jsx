import { useEffect, useState } from 'react'
import { ref, onValue, push, remove, update } from 'firebase/database'
import { db } from '../config/firebase'

const POR_PAGINA = 15

export default function LeccionesClases() {
  const [lecciones,  setLecciones]  = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [pagina,     setPagina]     = useState(1)
  const [modalCrear, setModalCrear] = useState(false)
  const [leccionEdit,setLeccionEdit]= useState(null)

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

  async function eliminar(id, titulo) {
    if (!confirm(`¿Eliminar la lección "${titulo}"?`)) return
    await remove(ref(db, `leccionesBiblicas/${id}`))
  }

  const q = busqueda.toLowerCase()
  const filtradas = (lecciones ?? []).filter(l =>
    (l.titulo || '').toLowerCase().includes(q) ||
    (l.descripcion || '').toLowerCase().includes(q)
  )

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA)
  const paginaActual = Math.min(pagina, totalPaginas || 1)
  const inicio       = (paginaActual - 1) * POR_PAGINA
  const paginadas    = filtradas.slice(inicio, inicio + POR_PAGINA)

  return (
    <div>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Lecciones Bíblicas
            {lecciones !== null && lecciones.length > 0 && (
              <span style={s.badge}>{lecciones.length}</span>
            )}
          </h3>
          <button
            className="btn btn-primary"
            style={s.btnSm}
            onClick={() => { setLeccionEdit(null); setModalCrear(true) }}
          >
            + Nueva lección
          </button>
        </div>

        {/* Buscador */}
        {lecciones && lecciones.length > 0 && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              style={s.searchInput}
              placeholder="Buscar por título o descripción…"
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            />
          </div>
        )}

        {lecciones === null && <p className="empty-msg">Cargando…</p>}
        {lecciones?.length === 0 && <p className="empty-msg">No hay lecciones bíblicas registradas aún.</p>}
        {lecciones !== null && lecciones.length > 0 && filtradas.length === 0 && (
          <p className="empty-msg">Sin resultados para "{busqueda}".</p>
        )}

        {/* Lista */}
        <div style={s.lista}>
          {paginadas.map((l, i) => (
            <div key={l.id} style={s.leccionCard}>
              {/* Fila principal: número + contenido + acciones */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={s.leccionNum}>{l.numero ?? inicio + i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.leccionTitulo}>{l.titulo}</div>
                  {l.totalLecciones && (
                    <div style={s.leccionChipWrap}>
                      <span style={s.leccionChip}>📚 {l.totalLecciones} lección{l.totalLecciones !== 1 ? 'es' : ''}</span>
                    </div>
                  )}
                  {l.descripcion && (
                    <div style={s.leccionDesc}>{l.descripcion}</div>
                  )}
                </div>
                <div style={s.acciones}>
                  <button
                    style={s.btnEditar}
                    title="Editar"
                    onClick={() => { setLeccionEdit(l); setModalCrear(true) }}
                  >
                    <IconEditar />
                  </button>
                  <button
                    style={s.btnEliminar}
                    title="Eliminar"
                    onClick={() => eliminar(l.id, l.titulo)}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
              {/* Recursos de apoyo */}
              <RecursosSection leccionId={l.id} recursos={l.recursos} />
            </div>
          ))}
        </div>

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
        <ModalLeccion
          leccion={leccionEdit}
          siguiente={(lecciones?.length ?? 0) + 1}
          onClose={() => { setModalCrear(false); setLeccionEdit(null) }}
        />
      )}
    </div>
  )
}

/* ── Modal crear / editar ── */
function ModalLeccion({ leccion, siguiente, onClose }) {
  const [numero,         setNumero]         = useState(leccion?.numero ?? siguiente)
  const [titulo,         setTitulo]         = useState(leccion?.titulo ?? '')
  const [descripcion,    setDescripcion]    = useState(leccion?.descripcion ?? '')
  const [totalLecciones, setTotalLecciones] = useState(leccion?.totalLecciones ?? '')
  const [estado,         setEstado]         = useState(null)
  const [cargando,       setCargando]       = useState(false)

  const esEdicion = !!leccion

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  async function guardar(e) {
    e.preventDefault()
    if (!titulo.trim()) return setEstado({ tipo: 'error', msg: 'El título es obligatorio.' })
    setCargando(true)
    setEstado(null)
    try {
      const datos = {
        numero:         Number(numero) || siguiente,
        titulo:         titulo.trim(),
        descripcion:    descripcion.trim() || null,
        totalLecciones: totalLecciones ? Number(totalLecciones) : null,
      }
      if (esEdicion) {
        await update(ref(db, `leccionesBiblicas/${leccion.id}`), datos)
      } else {
        datos.creadoEn = Date.now()
        await push(ref(db, 'leccionesBiblicas'), datos)
      }
      onClose()
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar la lección.' })
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-inner" style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>{esEdicion ? 'Editar lección' : 'Nueva lección bíblica'}</h2>
            <p style={m.subtitle}>{esEdicion ? 'Modifica los datos de la lección' : 'Registra una nueva lección bíblica'}</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}
          <form onSubmit={guardar}>
            <div className="form-group">
              <label>N° de lección</label>
              <input
                type="number" min={1}
                value={numero}
                onChange={e => setNumero(e.target.value)}
                style={{ maxWidth: 140 }}
              />
            </div>
            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Título <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                placeholder="Ej: El Sermón del Monte"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Cantidad de lecciones <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>(opcional)</span></label>
              <select value={totalLecciones} onChange={e => setTotalLecciones(e.target.value)} style={{ maxWidth: 200 }}>
                <option value="">— Sin especificar —</option>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} lección{n !== 1 ? 'es' : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Descripción <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.78rem' }}>(opcional)</span></label>
              <textarea
                placeholder="Resumen o notas de la lección…"
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>
            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear lección'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Recursos de apoyo ── */
function RecursosSection({ leccionId, recursos }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [titulo,    setTitulo]    = useState('')
  const [url,       setUrl]       = useState('')
  const [cargando,  setCargando]  = useState(false)
  const [error,     setError]     = useState('')

  const lista = Object.entries(recursos || {})
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (a.creadoEn || 0) - (b.creadoEn || 0))

  function iniciarNuevo() {
    setEditId(null); setTitulo(''); setUrl(''); setError(''); setMostrarForm(true)
  }
  function iniciarEditar(rec) {
    setEditId(rec.id); setTitulo(rec.titulo); setUrl(rec.url); setError(''); setMostrarForm(true)
  }
  function cancelar() {
    setMostrarForm(false); setEditId(null); setTitulo(''); setUrl(''); setError('')
  }

  async function guardar() {
    if (!titulo.trim()) return setError('El título es obligatorio.')
    if (!url.trim() || !url.trim().startsWith('http')) return setError('Ingresa una URL válida (debe comenzar con http).')
    setCargando(true); setError('')
    const datos = { titulo: titulo.trim(), url: url.trim() }
    if (editId) {
      await update(ref(db, `leccionesBiblicas/${leccionId}/recursos/${editId}`), datos)
    } else {
      datos.creadoEn = Date.now()
      await push(ref(db, `leccionesBiblicas/${leccionId}/recursos`), datos)
    }
    cancelar(); setCargando(false)
  }

  async function eliminar(id, tit) {
    if (!confirm(`¿Eliminar el recurso "${tit}"?`)) return
    await remove(ref(db, `leccionesBiblicas/${leccionId}/recursos/${id}`))
  }

  return (
    <div style={r.wrap}>
      {lista.length > 0 && (
        <div style={r.lista}>
          {lista.map(rec => (
            <div key={rec.id} style={r.item}>
              <span style={r.itemIcon}><IconLink /></span>
              <a href={rec.url} target="_blank" rel="noopener noreferrer" style={r.itemLink} title={rec.url}>
                {rec.titulo}
              </a>
              <div style={r.itemAcciones}>
                <button style={r.btnMin} title="Editar recurso" onClick={() => iniciarEditar(rec)}><IconEditar /></button>
                <button style={{ ...r.btnMin, ...r.btnMinRed }} title="Eliminar recurso" onClick={() => eliminar(rec.id, rec.titulo)}><IconTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarForm ? (
        <div style={r.form}>
          {error && <div style={r.error}>{error}</div>}
          <input
            style={r.input}
            placeholder="Título (ej: Canción tema, Material de estudio…)"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            autoFocus
          />
          <input
            style={r.input}
            placeholder="https://…"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') cancelar() }}
          />
          <div style={r.formBtns}>
            <button style={r.btnGuardar} onClick={guardar} disabled={cargando}>
              {cargando ? 'Guardando…' : editId ? 'Actualizar' : 'Agregar'}
            </button>
            <button style={r.btnCancelarForm} onClick={cancelar}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button style={r.btnAgregar} onClick={iniciarNuevo}>
          <IconLink /> Añadir recurso
        </button>
      )}
    </div>
  )
}

/* ── Iconos ── */
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

function IconEditar() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function IconLink() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
}

/* ── Estilos ── */
const s = {
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },
  btnSm: { padding: '0.45rem 1.1rem', fontSize: '0.86rem' },

  searchWrap:  { position: 'relative', marginBottom: '1rem' },
  searchIcon:  { position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  searchInput: { paddingLeft: '2.2rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10 },

  lista: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  leccionCard: {
    display: 'flex', flexDirection: 'column', gap: '0',
    padding: '0.9rem 1rem', border: '1.5px solid #e2e8f0',
    borderRadius: 12, background: '#fafbfc',
  },
  leccionNum: {
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.88rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  leccionTitulo:   { fontWeight: 700, color: '#023052', fontSize: '0.95rem' },
  leccionChipWrap: { marginTop: '0.3rem' },
  leccionChip:     { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#e0f2fe', color: '#0369a1', borderRadius: 99, fontSize: '0.74rem', fontWeight: 700, padding: '0.15rem 0.65rem' },
  leccionDesc:     { fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem', lineHeight: 1.55 },
  acciones:      { display: 'flex', gap: '0.4rem', flexShrink: 0 },
  btnEditar: {
    width: 30, height: 30, borderRadius: 7, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#023052', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  btnEliminar: {
    width: 30, height: 30, borderRadius: 7, border: '1.5px solid #fecaca',
    background: 'white', color: '#ef4444', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },

  pagination: { display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' },
  pageBtn: {
    minWidth: 32, height: 32, borderRadius: 7, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#023052', fontWeight: 600, fontSize: '0.86rem',
    cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pageBtnActivo: { background: '#023052', color: 'white', borderColor: '#023052' },
  pageInfo: { marginLeft: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' },
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
    borderRadius: 18, width: '100%', maxWidth: 480, margin: '1rem',
    boxShadow: '0 8px 40px rgba(2,48,82,0.18)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.5rem 1.6rem 1.2rem',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)',
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

/* ── Estilos de recursos ── */
const r = {
  wrap: {
    marginTop: '0.75rem', paddingTop: '0.65rem',
    borderTop: '1px dashed #e2e8f0',
  },
  lista: { display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' },
  item: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.35rem 0.6rem',
    background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd',
  },
  itemIcon: { color: '#0369a1', display: 'flex', flexShrink: 0 },
  itemLink: {
    flex: 1, color: '#0369a1', fontSize: '0.83rem', fontWeight: 600,
    textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  itemAcciones: { display: 'flex', gap: '0.25rem', flexShrink: 0 },
  btnMin: {
    width: 24, height: 24, borderRadius: 5, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#023052', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
  },
  btnMinRed: { color: '#ef4444', borderColor: '#fecaca' },
  form: {
    display: 'flex', flexDirection: 'column', gap: '0.45rem',
    padding: '0.7rem', background: '#f8fafc', borderRadius: 9, border: '1.5px solid #e2e8f0',
  },
  input: {
    padding: '0.42rem 0.65rem', borderRadius: 7, border: '1.5px solid #e2e8f0',
    fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', background: 'white',
  },
  error: {
    fontSize: '0.78rem', color: '#ef4444', fontWeight: 600,
    background: '#fef2f2', borderRadius: 6, padding: '0.25rem 0.6rem',
    border: '1px solid #fecaca',
  },
  formBtns: { display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' },
  btnGuardar: {
    padding: '0.32rem 1rem', borderRadius: 7,
    background: 'linear-gradient(135deg,#023052,#04508a)', color: 'white',
    border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
  },
  btnCancelarForm: {
    padding: '0.32rem 0.8rem', borderRadius: 7, background: 'white', color: '#64748b',
    border: '1.5px solid #e2e8f0', fontWeight: 600, fontSize: '0.8rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnAgregar: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.3rem 0.8rem', borderRadius: 7,
    background: 'white', color: '#0369a1',
    border: '1.5px dashed #bae6fd', fontSize: '0.79rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
