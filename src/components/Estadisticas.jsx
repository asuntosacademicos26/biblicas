import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../config/firebase'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

const PALETA = [
  '#023052','#04508a','#065f46','#6d28d9','#b45309',
  '#0369a1','#15803d','#7c3aed','#c2410c','#0e7490',
  '#1d4ed8','#9333ea','#d97706','#059669','#dc2626',
]

export default function Estadisticas() {
  const [clases,    setClases]    = useState(null)
  const [usuarios,  setUsuarios]  = useState([])
  const [facultades, setFacultades] = useState([])

  useEffect(() => onValue(ref(db, 'clases'), snap => {
    if (!snap.exists()) { setClases([]); return }
    setClases(Object.entries(snap.val()).map(([id, d]) => ({
      id, ...d, alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
    })))
  }), [])

  useEffect(() => onValue(ref(db, 'usuarios'), snap => {
    if (!snap.exists()) { setUsuarios([]); return }
    setUsuarios(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
  }), [])

  useEffect(() => onValue(ref(db, 'facultades'), snap => {
    if (!snap.exists()) { setFacultades([]); return }
    setFacultades(Object.values(snap.val()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
  }), [])

  if (clases === null) return <p className="empty-msg">Cargando estadísticas…</p>

  /* ── Métricas globales ── */
  const totalAlumnos = clases.reduce((s, c) => s + c.alumnosCount, 0)
  const docentesConClase = new Set(clases.map(c => c.docenteId).filter(Boolean))

  /* ── Agrupación por facultad ── */
  const porFacultad = {}
  clases.forEach(c => {
    const fac = c.facultad || 'Sin facultad'
    const esc = c.escuela  || 'Sin escuela'
    if (!porFacultad[fac]) porFacultad[fac] = { clases: 0, alumnos: 0, docentes: new Set(), escuelas: {} }
    porFacultad[fac].clases++
    porFacultad[fac].alumnos += c.alumnosCount
    if (c.docenteId) porFacultad[fac].docentes.add(c.docenteId)
    if (!porFacultad[fac].escuelas[esc]) porFacultad[fac].escuelas[esc] = { clases: 0, alumnos: 0, docentes: new Set() }
    porFacultad[fac].escuelas[esc].clases++
    porFacultad[fac].escuelas[esc].alumnos += c.alumnosCount
    if (c.docenteId) porFacultad[fac].escuelas[esc].docentes.add(c.docenteId)
  })

  const facOrdenadas = Object.entries(porFacultad).sort((a, b) => {
    const ai = facultades.findIndex(f => f.nombre === a[0])
    const bi = facultades.findIndex(f => f.nombre === b[0])
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const labels    = facOrdenadas.map(([n]) => n)
  const colores   = labels.map((_, i) => PALETA[i % PALETA.length])
  const coloresA  = colores.map(c => c + 'cc')

  /* ── Datos para gráficos ── */
  const barClasesData = {
    labels,
    datasets: [{
      label: 'Clases',
      data: facOrdenadas.map(([, d]) => d.clases),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  const barDocentesData = {
    labels,
    datasets: [{
      label: 'Docentes',
      data: facOrdenadas.map(([, d]) => d.docentes.size),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  const doughnutAlumnosData = {
    labels,
    datasets: [{
      data: facOrdenadas.map(([, d]) => d.alumnos),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
    }],
  }

  const barAlumnosData = {
    labels,
    datasets: [{
      label: 'Alumnos',
      data: facOrdenadas.map(([, d]) => d.alumnos),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  const barOpts = (titulo) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { callbacks: { title: ([i]) => i.label } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 35, minRotation: 0 } },
      y: { grid: { color: '#f1f5f9' }, ticks: { stepSize: 1, font: { size: 11 } }, beginAtZero: true },
    },
  })

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: { font: { size: 11 }, boxWidth: 14, padding: 12 },
      },
    },
  }

  return (
    <div>
      {/* ── Tarjetas globales ── */}
      <div style={s.globalGrid}>
        <MetricaCard valor={clases.length}         label="Clases bíblicas"        color="#023052" bg="#e0eaf3" icon={<IconClases />} />
        <MetricaCard valor={docentesConClase.size}  label="Docentes con clase"      color="#065f46" bg="#d1fae5" icon={<IconDocentes />} />
        <MetricaCard valor={totalAlumnos}           label="Alumnos en total"        color="#6d28d9" bg="#ede9fe" icon={<IconAlumnos />} />
        <MetricaCard valor={facOrdenadas.length}    label="Facultades participando" color="#b45309" bg="#fef3c7" icon={<IconFacBig />} />
      </div>

      {/* ── Fila de gráficos superiores ── */}
      {facOrdenadas.length > 0 && (
        <>
          <div style={s.chartRow}>
            <div className="card" style={s.chartCard}>
              <div style={s.chartTitle}>Clases por facultad</div>
              <div style={s.chartWrap}>
                <Bar data={barClasesData} options={barOpts()} />
              </div>
            </div>
            <div className="card" style={s.chartCard}>
              <div style={s.chartTitle}>Docentes por facultad</div>
              <div style={s.chartWrap}>
                <Bar data={barDocentesData} options={barOpts()} />
              </div>
            </div>
          </div>

          <div style={s.chartRow}>
            <div className="card" style={{ ...s.chartCard, flex: '1 1 340px' }}>
              <div style={s.chartTitle}>Distribución de alumnos</div>
              <div style={{ ...s.chartWrap, height: 260 }}>
                <Doughnut data={doughnutAlumnosData} options={doughnutOpts} />
              </div>
            </div>
            <div className="card" style={{ ...s.chartCard, flex: '2 1 420px' }}>
              <div style={s.chartTitle}>Alumnos por facultad</div>
              <div style={s.chartWrap}>
                <Bar data={barAlumnosData} options={barOpts()} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Tabla por facultad / escuela ── */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Detalle por Facultad y Escuela
          </h3>
        </div>
        {facOrdenadas.length === 0 && <p className="empty-msg">No hay clases registradas aún.</p>}
        {facOrdenadas.map(([facNombre, facData], fi) => (
          <FacultadBloque
            key={facNombre}
            nombre={facNombre}
            data={facData}
            usuarios={usuarios}
            color={PALETA[fi % PALETA.length]}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Bloque por facultad ── */
function FacultadBloque({ nombre, data, usuarios, color }) {
  const [abierto, setAbierto] = useState(true)
  const escuelas = Object.entries(data.escuelas).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div style={s.facBloque}>
      <div style={{ ...s.facHeader, borderLeft: `4px solid ${color}` }} onClick={() => setAbierto(v => !v)}>
        <div style={s.facLeft}>
          <div style={{ ...s.facDot, background: color }} />
          <div>
            <div style={s.facNombre}>{nombre}</div>
            <div style={s.facMeta}>
              {data.clases} clase{data.clases !== 1 ? 's' : ''} · {data.docentes.size} docente{data.docentes.size !== 1 ? 's' : ''} · {data.alumnos} alumno{data.alumnos !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={s.facRight}>
          <span style={{ ...s.pill, background: color + '22', color }}>
            {data.clases} clases
          </span>
          <span style={{ ...s.pillGreen }}>
            {data.docentes.size} docentes
          </span>
          <span style={{ ...s.pillPurple }}>
            {data.alumnos} alumnos
          </span>
          <span style={{ ...s.chevron, transform: abierto ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
        </div>
      </div>

      {abierto && (
        <div style={s.escuelasWrap}>
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Escuela profesional</th>
                  <th style={{ textAlign: 'center' }}>Clases</th>
                  <th style={{ textAlign: 'center' }}>Docentes</th>
                  <th style={{ textAlign: 'center' }}>Alumnos</th>
                  <th>Docentes asignados</th>
                </tr>
              </thead>
              <tbody>
                {escuelas.map(([escNombre, escData]) => {
                  const docentesList = [...escData.docentes].map(uid => {
                    const u = usuarios.find(u => u.id === uid)
                    return u ? (u.nombreCompleto || u.username) : uid
                  })
                  return (
                    <tr key={escNombre}>
                      <td><div style={s.escNombre}>{escNombre}</div></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ ...s.pill, background: '#e0eaf3', color: '#023052' }}>{escData.clases}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ ...s.pillGreen }}>{escData.docentes.size}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ ...s.pillPurple }}>{escData.alumnos}</span>
                      </td>
                      <td>
                        <div style={s.docentesTags}>
                          {docentesList.map((n, i) => (
                            <span key={i} style={s.docenteTag}>{n}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tarjeta métrica ── */
function MetricaCard({ valor, label, color, bg, icon }) {
  return (
    <div style={{ ...s.metricaCard, borderTop: `3px solid ${color}` }}>
      <div style={{ ...s.metricaIconWrap, background: bg, color }}>{icon}</div>
      <div style={{ ...s.metricaValor, color }}>{valor}</div>
      <div style={s.metricaLabel}>{label}</div>
    </div>
  )
}

/* ── Iconos ── */
function IconClases() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IconDocentes() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconAlumnos() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconFacBig() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

/* ── Estilos ── */
const s = {
  globalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '1rem', marginBottom: '1rem',
  },
  metricaCard: {
    background: 'white', borderRadius: 14,
    padding: '1.2rem 1.3rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(2,48,82,0.07)',
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
  },
  metricaIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '0.15rem',
  },
  metricaValor: { fontSize: '2.1rem', fontWeight: 800, lineHeight: 1 },
  metricaLabel: { fontSize: '0.82rem', color: '#64748b', fontWeight: 500 },

  chartRow: {
    display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem',
  },
  chartCard: { flex: '1 1 300px', padding: '1.2rem' },
  chartTitle: { fontWeight: 700, color: '#023052', fontSize: '0.93rem', marginBottom: '0.9rem' },
  chartWrap:  { height: 230, position: 'relative' },

  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },

  facBloque: {
    border: '1.5px solid #e2e8f0', borderRadius: 12,
    marginBottom: '0.75rem', overflow: 'hidden',
  },
  facHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.85rem 1rem', background: '#f8fafc',
    cursor: 'pointer', gap: '1rem', flexWrap: 'wrap',
    userSelect: 'none',
  },
  facLeft:  { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 },
  facDot:   { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  facNombre:{ fontWeight: 800, color: '#023052', fontSize: '0.97rem' },
  facMeta:  { fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.1rem' },
  facRight: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  chevron:  { fontSize: '1rem', color: '#94a3b8', transition: 'transform 0.2s', flexShrink: 0 },

  escuelasWrap: { padding: '0 0.5rem 0.5rem' },
  escNombre:    { fontWeight: 600, color: '#023052', fontSize: '0.88rem' },

  pill: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 99, fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.65rem',
  },
  pillGreen:  { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.65rem', background: '#d1fae5', color: '#065f46' },
  pillPurple: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, fontSize: '0.74rem', fontWeight: 700, padding: '0.18rem 0.65rem', background: '#ede9fe', color: '#6d28d9' },

  docentesTags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  docenteTag: {
    background: '#f1f5f9', color: '#334155', borderRadius: 99,
    fontSize: '0.74rem', fontWeight: 600, padding: '0.15rem 0.6rem',
  },
}
