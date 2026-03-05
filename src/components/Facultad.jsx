import { useEffect, useState } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { db } from '../config/firebase'

export default function Facultad() {
  const [facultades,   setFacultades]   = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda,     setBusqueda]     = useState('')
  const [toast,        setToast]        = useState(false)

  useEffect(() => {
    return onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      setFacultades(lista)
    })
  }, [])

  async function eliminar(id, nombre) {
    if (!confirm(`¿Eliminar la facultad "${nombre}"?`)) return
    await remove(ref(db, `facultades/${id}`))
  }

  const filtradas = facultades?.filter(f => {
    const q = busqueda.toLowerCase()
    return (
      f.nombre.toLowerCase().includes(q) ||
      (f.siglas || '').toLowerCase().includes(q) ||
      (f.decano || '').toLowerCase().includes(q) ||
      (f.escuelas || []).some(e => e.toLowerCase().includes(q))
    )
  }) ?? []

  return (
    <>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Facultades
            {facultades && facultades.length > 0 && (
              <span style={s.countBadge}>{facultades.length}</span>
            )}
          </h3>
          <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalAbierto(true)}>
            + Agregar facultad
          </button>
        </div>

        {facultades && facultades.length > 0 && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre, siglas, decano o escuela…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {facultades === null && <p className="empty-msg">Cargando…</p>}
        {facultades?.length === 0 && <p className="empty-msg">No hay facultades registradas aún.</p>}
        {facultades && facultades.length > 0 && filtradas.length === 0 && (
          <p className="empty-msg">No se encontraron resultados para "{busqueda}".</p>
        )}

        {filtradas.length > 0 && (
          <div style={s.grid}>
            {filtradas.map(f => (
              <FacultadCard key={f.id} facultad={f} onEliminar={() => eliminar(f.id, f.nombre)} />
            ))}
          </div>
        )}
      </div>

      {modalAbierto && (
        <ModalAgregarFacultad
          onClose={() => setModalAbierto(false)}
          onSuccess={() => { setModalAbierto(false); setToast(true); setTimeout(() => setToast(false), 3000) }}
        />
      )}

      {toast && (
        <div style={s.toast}>
          <span style={s.toastIcon}>✓</span>
          Facultad creada con éxito
        </div>
      )}
    </>
  )
}

/* ── Tarjeta de facultad ── */
function FacultadCard({ facultad, onEliminar }) {
  const [hovered,    setHovered]    = useState(false)
  const [verEscuelas, setVerEscuelas] = useState(false)
  const escuelas = facultad.escuelas || []

  return (
    <div
      style={{
        ...s.card,
        boxShadow: hovered ? '0 8px 24px rgba(2,48,82,0.14)' : '0 2px 8px rgba(2,48,82,0.07)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cabecera */}
      <div style={s.cardTop}>
        <div style={s.iconWrap}>
          {(facultad.siglas || facultad.nombre.charAt(0)).toUpperCase().slice(0, 3)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.facultadNombre}>{facultad.nombre}</div>
          {facultad.siglas && <span style={s.siglasBadge}>{facultad.siglas}</span>}
        </div>
      </div>

      {/* Info */}
      <div style={s.cardInfo}>
        {facultad.descripcion && (
          <div style={s.infoRow}>
            <span style={s.infoLabel}>Descripción</span>
            <span style={s.infoVal}>{facultad.descripcion}</span>
          </div>
        )}

        {/* Escuelas */}
        <div style={s.escuelasSection}>
          <button style={s.escuelasToggle} onClick={() => setVerEscuelas(v => !v)}>
            <IconEscuela />
            <span>{escuelas.length} escuela{escuelas.length !== 1 ? 's' : ''} profesional{escuelas.length !== 1 ? 'es' : ''}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{verEscuelas ? '▲' : '▼'}</span>
          </button>
          {verEscuelas && (
            <div style={s.escuelasList}>
              {escuelas.length === 0 && (
                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Sin escuelas registradas.</span>
              )}
              {escuelas.map((e, i) => (
                <div key={i} style={s.escuelaItem}>
                  <span style={s.escuelaDot} />
                  {e}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={s.cardFooter}>
        <button
          className="btn-danger-outline"
          style={{ fontSize: '0.78rem', padding: '0.28rem 0.7rem' }}
          onClick={onEliminar}
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

/* ── Modal agregar facultad ── */
function ModalAgregarFacultad({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: '', siglas: '', descripcion: '',
  })
  const [escuelas,  setEscuelas]  = useState([''])
  const [estado,    setEstado]    = useState(null)
  const [cargando,  setCargando]  = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function agregarEscuela() {
    setEscuelas(prev => [...prev, ''])
  }

  function actualizarEscuela(i, valor) {
    setEscuelas(prev => prev.map((e, idx) => idx === i ? valor : e))
  }

  function quitarEscuela(i) {
    setEscuelas(prev => prev.filter((_, idx) => idx !== i))
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim())
      return setEstado({ tipo: 'error', msg: 'El nombre de la facultad es obligatorio.' })

    const escuelasFiltradas = escuelas.map(e => e.trim()).filter(Boolean)

    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, 'facultades'), {
        ...form,
        escuelas: escuelasFiltradas,
        creadoEn: Date.now(),
      })
      onSuccess()
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar la facultad.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Agregar facultad</h2>
            <p style={m.subtitle}>Registra una nueva facultad en el sistema</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={guardar}>

            {/* Datos de la facultad */}
            <div style={m.secLabel}><IconEdificio /> Datos de la facultad</div>

            <div className="form-group">
              <label>Nombre <Req /></label>
              <input placeholder="Ej: Facultad de Ingeniería y Arquitectura" value={form.nombre} onChange={set_('nombre')} autoFocus />
            </div>

            <div className="form-group">
              <label>Siglas</label>
              <input placeholder="Ej: FIA" value={form.siglas} onChange={set_('siglas')} />
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Descripción</label>
              <textarea placeholder="Breve descripción…" value={form.descripcion} onChange={set_('descripcion')} style={{ minHeight: 64 }} />
            </div>

            {/* Escuelas profesionales */}
            <div style={{ ...m.secLabel, marginTop: '1.2rem' }}><IconEscuela /> Escuelas profesionales</div>

            <div style={m.escuelasWrap}>
              {escuelas.map((esc, i) => (
                <div key={i} style={m.escuelaRow}>
                  <input
                    placeholder={`Ej: Ingeniería de Sistemas`}
                    value={esc}
                    onChange={e => actualizarEscuela(i, e.target.value)}
                  />
                  {escuelas.length > 1 && (
                    <button
                      type="button"
                      style={m.btnQuitarEscuela}
                      onClick={() => quitarEscuela(i)}
                      title="Quitar"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" style={m.btnAgregarEscuela} onClick={agregarEscuela}>
                + Agregar escuela
              </button>
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Agregar facultad'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function Req() { return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span> }

function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconEdificio() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconEscuela() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}

/* ── Estilos ── */
const s = {
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
  searchWrap:  { position: 'relative', marginBottom: '1.2rem' },
  searchIcon:  { position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  searchInput: { paddingLeft: '2.2rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '1.1rem',
  },
  card: {
    background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14,
    overflow: 'hidden', transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '1.1rem 1.2rem 0.8rem' },
  iconWrap: {
    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.82rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: '0.04em',
  },
  facultadNombre: { fontWeight: 800, color: '#023052', fontSize: '0.92rem', lineHeight: 1.35 },
  siglasBadge: {
    display: 'inline-block', marginTop: '0.3rem',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.55rem', letterSpacing: '0.05em',
  },
  cardInfo:  { padding: '0 1.2rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  infoRow:   { display: 'flex', gap: '0.5rem', fontSize: '0.82rem' },
  infoLabel: { color: '#94a3b8', fontWeight: 600, minWidth: 75 },
  infoVal:   { color: '#475569' },

  escuelasSection: { marginTop: '0.5rem' },
  escuelasToggle: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%',
    background: '#eef2f7', border: '1px solid #dde4ee', borderRadius: 8,
    padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
    color: '#023052', cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.18s',
  },
  escuelasList: { padding: '0.6rem 0.4rem 0.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  escuelaItem:  { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#475569' },
  escuelaDot:   { width: 6, height: 6, borderRadius: '50%', background: '#023052', flexShrink: 0 },

  cardFooter: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '0.65rem 1.2rem', borderTop: '1px solid #e2e8f0', background: 'white',
  },

  // Toast
  toast: {
    position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
    background: '#065f46', color: 'white',
    padding: '0.85rem 2rem', borderRadius: 12,
    fontSize: '0.95rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
    animation: 'slideUp 0.25s ease',
    zIndex: 2000, whiteSpace: 'nowrap',
  },
  toastIcon: {
    background: 'rgba(255,255,255,0.2)', borderRadius: '50%',
    width: 26, height: 26, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem',
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
    width: '100%', maxWidth: 480, margin: '1rem',
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
  body:   { padding: '1.6rem', overflowY: 'auto' },
  grid2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  secLabel: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.78rem', fontWeight: 700, color: '#023052',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '0.9rem', paddingBottom: '0.5rem',
    borderBottom: '1.5px solid #e2e8f0',
  },
  escuelasWrap: { display: 'flex', flexDirection: 'column', gap: '0.55rem' },
  escuelaRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  btnQuitarEscuela: {
    background: '#fef2f2', border: '1.5px solid #fecaca',
    color: '#ef4444', borderRadius: 8,
    width: 34, height: 38, fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
    transition: 'background 0.18s',
  },
  btnAgregarEscuela: {
    background: '#f1f5f9', border: '1.5px dashed #94a3b8',
    color: '#023052', borderRadius: 8,
    padding: '0.5rem', fontSize: '0.83rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.18s, border-color 0.18s',
    marginTop: '0.2rem',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
}
