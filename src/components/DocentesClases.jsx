import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../config/firebase'

export default function DocentesClases() {
  const [docentes,  setDocentes]  = useState(null)
  const [clases,    setClases]    = useState([])
  const [busqueda,  setBusqueda]  = useState('')
  const [expandido, setExpandido] = useState({})

  useEffect(() => {
    return onValue(ref(db, 'usuarios'), snap => {
      if (!snap.exists()) { setDocentes([]); return }
      setDocentes(
        Object.entries(snap.val())
          .filter(([, d]) => d.rol === 'docente' || d.rol === 'admin')
          .map(([id, d]) => ({ id, ...d }))
          .sort((a, b) => (a.nombreCompleto || a.username).localeCompare(b.nombreCompleto || b.username))
      )
    })
  }, [])

  useEffect(() => {
    return onValue(ref(db, 'clases'), snap => {
      if (!snap.exists()) { setClases([]); return }
      setClases(
        Object.entries(snap.val()).map(([id, d]) => ({
          id, ...d,
          alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
        }))
      )
    })
  }, [])

  function toggleExpandido(id) {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const q = busqueda.toLowerCase()

  // Solo docentes que tienen al menos una clase
  const docentesConClases = (docentes ?? [])
    .map(d => ({ ...d, clases: clases.filter(c => c.docenteId === d.id).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')) }))
    .filter(d => d.clases.length > 0)
    .filter(d =>
      (d.nombreCompleto || d.username).toLowerCase().includes(q) ||
      (d.username || '').toLowerCase().includes(q)
    )

  return (
    <div>
      <div className="card">
        <div style={s.cardHeader}>
          <div>
            <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
              Docentes con Clases Bíblicas
              {docentes !== null && (
                <span style={s.badge}>{docentesConClases.length}</span>
              )}
            </h3>
            <p style={s.subDesc}>Docentes que tienen al menos una clase bíblica asignada</p>
          </div>
        </div>

        {/* Buscador */}
        <div style={s.searchWrap}>
          <span style={s.searchIcon}><IconSearch /></span>
          <input
            style={s.searchInput}
            placeholder="Buscar docente…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {docentes === null && <p className="empty-msg">Cargando…</p>}
        {docentes !== null && docentesConClases.length === 0 && !busqueda && (
          <p className="empty-msg">Ningún docente tiene clases asignadas aún.</p>
        )}
        {docentes !== null && busqueda && docentesConClases.length === 0 && (
          <p className="empty-msg">Sin resultados para "{busqueda}".</p>
        )}

        <div style={s.lista}>
          {docentesConClases.map(d => {
            const abierto = expandido[d.id]
            const inicial = (d.nombreCompleto || d.username).charAt(0).toUpperCase()

            // Lugares únicos de sus clases
            const lugares = [...new Set(d.clases.map(c => c.lugar).filter(Boolean))]
            // Facultades únicas
            const facultades = [...new Set(d.clases.map(c => c.facultad).filter(Boolean))]

            return (
              <div key={d.id} style={s.docenteCard}>
                {/* Cabecera */}
                <div style={s.docenteHeader} onClick={() => toggleExpandido(d.id)}>
                  <div style={s.docenteLeft}>
                    <div style={s.avatar}>{inicial}</div>
                    <div>
                      <div style={s.docenteNombre}>{d.nombreCompleto || d.username}</div>
                      <div style={s.docenteUser}>
                        @{d.username}
                        <span style={s.rolChip}>{d.rol}</span>
                      </div>
                    </div>
                  </div>

                  {/* Derecha: conteo + ubicaciones */}
                  <div style={s.docenteRight}>
                    <div style={s.rightInfo}>
                      {/* Facultades */}
                      {facultades.length > 0 && (
                        <div style={s.facWrap}>
                          {facultades.map((f, i) => (
                            <span key={i} style={s.facChip}><IconFac />{f}</span>
                          ))}
                        </div>
                      )}
                      {/* Lugares */}
                      {lugares.length > 0 && (
                        <div style={s.lugaresWrap}>
                          {lugares.map((l, i) => (
                            <span key={i} style={s.lugarChip}><IconPin />{l}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={s.countCol}>
                      <span style={s.clasesBadge}>{d.clases.length}</span>
                      <span style={s.clasesLabel}>clase{d.clases.length !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ ...s.chevron, transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>
                </div>

                {/* Lista expandida */}
                {abierto && (
                  <div style={s.clasesWrap}>
                    {d.clases.map(c => (
                      <div key={c.id} style={s.claseItem}>
                        <div style={s.claseIcon}>📖</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.claseNombre}>{c.nombre}</div>
                          <div style={s.claseMeta}>
                            {[
                              c.facultad,
                              c.escuela && `› ${c.escuela}`,
                              c.ciclo && `Ciclo ${c.ciclo}`,
                              c.grupo && `Grupo ${c.grupo}`,
                            ].filter(Boolean).join(' · ')}
                          </div>
                          {c.lugar && (
                            <div style={s.claseUbicacion}><IconPin />{c.lugar}</div>
                          )}
                        </div>
                        <div style={s.alumnosCount}>
                          <IconPersonas />
                          {c.alumnosCount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Iconos ── */
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconPersonas() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconPin() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
}
function IconFac() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

/* ── Estilos ── */
const s = {
  cardHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  subDesc: { fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' },
  badge: {
    display: 'inline-flex', alignItems: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },

  searchWrap:  { position: 'relative', marginBottom: '1rem' },
  searchIcon:  { position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' },
  searchInput: { paddingLeft: '2.2rem', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10 },

  lista: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },

  docenteCard: {
    border: '1.5px solid #e2e8f0', borderRadius: 12,
    overflow: 'hidden', background: 'white',
  },
  docenteHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.85rem 1.1rem', cursor: 'pointer', gap: '1rem',
  },
  docenteLeft: { display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 },
  avatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  docenteNombre: { fontWeight: 700, color: '#023052', fontSize: '0.95rem' },
  docenteUser: {
    fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem',
    display: 'flex', alignItems: 'center', gap: '0.35rem',
  },
  rolChip: {
    background: '#f1f5f9', color: '#475569', borderRadius: 99,
    fontSize: '0.7rem', fontWeight: 700, padding: '0.05rem 0.45rem',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },

  docenteRight: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 },
  rightInfo: { display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' },
  facWrap:    { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-end' },
  lugaresWrap:{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-end' },
  facChip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    background: '#eff6ff', color: '#1d4ed8', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.55rem',
  },
  lugarChip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    background: '#f0fdf4', color: '#166534', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.55rem',
  },
  countCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem' },
  clasesBadge: {
    background: '#023052', color: 'white', borderRadius: 99,
    fontSize: '1rem', fontWeight: 800, padding: '0.1rem 0.65rem',
    lineHeight: 1.4,
  },
  clasesLabel: { fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 },
  chevron: {
    fontSize: '1rem', color: '#94a3b8',
    transition: 'transform 0.2s', lineHeight: 1, userSelect: 'none',
  },

  clasesWrap: { borderTop: '1px solid #f1f5f9', background: '#fafbfc' },
  claseItem: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
    padding: '0.7rem 1.1rem 0.7rem 1.5rem',
    borderBottom: '1px solid #f1f5f9',
  },
  claseIcon:     { fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' },
  claseNombre:   { fontWeight: 600, color: '#023052', fontSize: '0.88rem' },
  claseMeta:     { fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.15rem' },
  claseUbicacion: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    fontSize: '0.74rem', color: '#166534', fontWeight: 600, marginTop: '0.2rem',
  },
  alumnosCount: {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    fontSize: '0.78rem', color: '#64748b', fontWeight: 600, flexShrink: 0, marginTop: '0.15rem',
  },
}
