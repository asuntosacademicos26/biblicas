import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../config/firebase'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import LoginModal from '../components/LoginModal'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

/* ── Paleta ── */
const PALETA = [
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#ef4444',
  '#22c55e','#3b82f6','#a855f7','#f97316','#06b6d4',
  '#84cc16','#e879f9','#fb7185','#34d399','#60a5fa',
]
const C_ASD      = '#2563eb'
const C_OTRAS    = '#ea580c'
const C_RECIENTE = '#9333ea'
const C_DECIDIO  = '#16a34a'

/* ── Helpers ── */
function esRecientePorFecha(fechaBautizo) {
  if (!fechaBautizo) return true
  const inicio = new Date(fechaBautizo + 'T00:00:00')
  const limite = new Date(inicio)
  limite.setMonth(limite.getMonth() + 6)
  return new Date() <= limite
}
function clasificarReligion(religion) {
  const r = (religion || '').toLowerCase().trim()
  if (!r || ['ninguna','sin religion','sin religión','no','ninguno','ateo','atea','agnóstico','agnostico','ninguna religion'].includes(r))
    return 'sin'
  if (r.includes('adventist') || r.includes('bautizad')) return 'bautizados'
  return 'otras'
}
function contarEstados(alumnosRaw, dataAlumnos) {
  let bautizados = 0, otras = 0, recientes = 0, decidio = 0
  Object.values(alumnosRaw || {}).forEach(a => {
    const match = dataAlumnos.find(d =>
      (a.dni && d.dni === a.dni) ||
      (a.codigoEstudiante && d.codigoEstudiante === a.codigoEstudiante)
    )
    const religion = (match?.religion || a.religion || '').trim()
    const programa = a.programaBautizo || ''
    if (programa === 'Se bautizó') {
      if (esRecientePorFecha(a.fechaBautizo)) recientes++
      else bautizados++
    } else {
      const cat = clasificarReligion(religion)
      if (cat === 'bautizados') bautizados++
      else if (cat === 'otras') otras++
    }
    if (programa === 'Decidió') decidio++
  })
  return { bautizados, otras, recientes, decidio }
}

/* ── Opciones Chart.js ── */
const barOpts = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b', titleColor: '#f1f5f9',
      bodyColor: '#94a3b8', padding: 12, cornerRadius: 8,
      borderColor: '#334155', borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 35 },
    },
    y: {
      grid: { color: '#f1f5f9', lineWidth: 1 },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1 },
      beginAtZero: true,
    },
  },
})

const stackedOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { font: { size: 11, weight: '600' }, color: '#334155', padding: 16, boxWidth: 13, useBorderRadius: true, borderRadius: 3 },
    },
    tooltip: {
      backgroundColor: '#1e293b', titleColor: '#f1f5f9',
      bodyColor: '#94a3b8', padding: 12, cornerRadius: 8,
    },
  },
  scales: {
    x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 35 } },
    y: { stacked: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' }, beginAtZero: true },
  },
}

const doughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: {
      position: 'right',
      labels: { font: { size: 11, weight: '600' }, color: '#334155', padding: 14, boxWidth: 13, useBorderRadius: true, borderRadius: 3 },
    },
    tooltip: {
      backgroundColor: '#1e293b', titleColor: '#f1f5f9',
      bodyColor: '#94a3b8', padding: 12, cornerRadius: 8,
    },
  },
}

/* ── Componentes ── */
function MetricCard({ label, value, color, bg }) {
  return (
    <div style={{ ...sc.metric, background: bg, border: `1px solid ${color}22` }}>
      <div style={{ ...sc.metricBar, background: color }} />
      <div style={{ ...sc.metricValue, color }}>{value ?? '—'}</div>
      <div style={sc.metricLabel}>{label}</div>
    </div>
  )
}

function SectionTitle({ children, color = '#6366f1' }) {
  return (
    <div style={{ ...sc.secTitle, borderLeft: `3px solid ${color}` }}>
      {children}
    </div>
  )
}

function ChartCard({ title, subtitle, accentColor = '#6366f1', height = 260, children }) {
  return (
    <div style={sc.card}>
      <div style={sc.cardHead}>
        <div style={{ ...sc.cardAccent, background: accentColor }} />
        <div>
          <div style={sc.cardTitle}>{title}</div>
          {subtitle && <div style={sc.cardSubtitle}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

/* ── Landing ── */
export default function Landing() {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clases,      setClases]      = useState(null)
  const [usuarios,    setUsuarios]    = useState([])
  const [facultades,  setFacultades]  = useState([])
  const [dataAlumnos, setDataAlumnos] = useState([])

  useEffect(() => onValue(ref(db, 'clases'), snap => {
    if (!snap.exists()) { setClases([]); return }
    setClases(Object.entries(snap.val()).map(([id, d]) => ({
      id, ...d,
      alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
      alumnosRaw: d.alumnos || {},
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
  useEffect(() => onValue(ref(db, 'dataAlumnos'), snap => {
    if (!snap.exists()) { setDataAlumnos([]); return }
    setDataAlumnos(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
  }), [])

  /* ── Cálculos ── */
  const totalClases     = clases?.length ?? 0
  const totalAlumnos    = clases?.reduce((s, c) => s + c.alumnosCount, 0) ?? 0
  const totalDocentes   = new Set(clases?.map(c => c.docenteId).filter(Boolean)).size
  const totalFacultades = facultades.length

  let gBautizados = 0, gOtras = 0, gRecientes = 0, gDecidio = 0
  clases?.forEach(c => {
    const e = contarEstados(c.alumnosRaw, dataAlumnos)
    gBautizados += e.bautizados; gOtras += e.otras
    gRecientes  += e.recientes;  gDecidio += e.decidio
  })

  const porFacultad = {}
  clases?.forEach(c => {
    const fac = c.facultad || 'Sin facultad'
    const esc = c.escuela  || 'Sin escuela'
    if (!porFacultad[fac]) porFacultad[fac] = {
      clases: 0, alumnos: 0, docentes: new Set(),
      bautizados: 0, otras: 0, recientes: 0, decidio: 0, escuelas: {},
    }
    const e = contarEstados(c.alumnosRaw, dataAlumnos)
    porFacultad[fac].clases++
    porFacultad[fac].alumnos    += c.alumnosCount
    porFacultad[fac].bautizados += e.bautizados
    porFacultad[fac].otras      += e.otras
    porFacultad[fac].recientes  += e.recientes
    porFacultad[fac].decidio    += e.decidio
    if (c.docenteId) porFacultad[fac].docentes.add(c.docenteId)
    if (!porFacultad[fac].escuelas[esc])
      porFacultad[fac].escuelas[esc] = { clases: 0, alumnos: 0, docentes: new Set() }
    porFacultad[fac].escuelas[esc].clases++
    porFacultad[fac].escuelas[esc].alumnos += c.alumnosCount
    if (c.docenteId) porFacultad[fac].escuelas[esc].docentes.add(c.docenteId)
  })

  const facOrdenadas = Object.entries(porFacultad).sort((a, b) => {
    const ai = facultades.findIndex(f => f.nombre === a[0])
    const bi = facultades.findIndex(f => f.nombre === b[0])
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
    if (ai === -1) return 1; if (bi === -1) return -1
    return ai - bi
  })

  const labels   = facOrdenadas.map(([n]) => n)
  const colores  = labels.map((_, i) => PALETA[i % PALETA.length])
  const coloresA = colores.map(c => c + 'cc')

  const barClasesData   = { labels, datasets: [{ label: 'Clases',   data: facOrdenadas.map(([,d]) => d.clases),        backgroundColor: coloresA, borderColor: colores, borderWidth: 2, borderRadius: 8 }] }
  const barDocentesData = { labels, datasets: [{ label: 'Docentes', data: facOrdenadas.map(([,d]) => d.docentes.size), backgroundColor: coloresA, borderColor: colores, borderWidth: 2, borderRadius: 8 }] }
  const barAlumnosData  = { labels, datasets: [{ label: 'Alumnos',  data: facOrdenadas.map(([,d]) => d.alumnos),       backgroundColor: coloresA, borderColor: colores, borderWidth: 2, borderRadius: 8 }] }
  const doughnutData    = {
    labels: facOrdenadas.map(([n,d]) => `${n}  ·  ${d.alumnos}`),
    datasets: [{ data: facOrdenadas.map(([,d]) => d.alumnos), backgroundColor: coloresA, borderColor: colores, borderWidth: 2, hoverOffset: 10 }],
  }
  const barEstadoData = {
    labels,
    datasets: [
      { label: `Bautizados ASD  ·  ${gBautizados}`,    data: facOrdenadas.map(([,d]) => d.bautizados), backgroundColor: C_ASD+'cc',      borderColor: C_ASD,      borderWidth: 2, borderRadius: 4, stack: 'e' },
      { label: `Otras religiones  ·  ${gOtras}`,       data: facOrdenadas.map(([,d]) => d.otras),      backgroundColor: C_OTRAS+'cc',     borderColor: C_OTRAS,    borderWidth: 2, borderRadius: 4, stack: 'e' },
      { label: `Recién bautizados  ·  ${gRecientes}`,  data: facOrdenadas.map(([,d]) => d.recientes),  backgroundColor: C_RECIENTE+'cc',  borderColor: C_RECIENTE, borderWidth: 2, borderRadius: 4, stack: 'e' },
      { label: `Decidió  ·  ${gDecidio}`,              data: facOrdenadas.map(([,d]) => d.decidio),    backgroundColor: C_DECIDIO+'cc',   borderColor: C_DECIDIO,  borderWidth: 2, borderRadius: 4, stack: 'e' },
    ],
  }

  const cargando = clases === null

  return (
    <div style={s.page}>

      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navInner}>
          <div style={s.navBrand}>
            <div style={s.navLogoWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div>
              <div style={s.navTitle}>Clases Bíblicas</div>
              <div style={s.navSub}>Universidad Peruana Unión — Juliaca</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={s.btnNav} onClick={() => setModalAbierto(true)}>
            Ingresar al sistema →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroLeft}>
            <div style={s.heroTag}>Dashboard Público · Tiempo Real</div>
            <h1 style={s.heroTitle}>Estadísticas del Programa de<br/>Clases Bíblicas</h1>
            <p style={s.heroDesc}>Seguimiento espiritual de los estudiantes de la Universidad Peruana Unión Juliaca.</p>
          </div>
          {!cargando && (
            <div style={s.heroStats}>
              {[
                { v: totalFacultades, l: 'Facultades',     c: '#a78bfa' },
                { v: totalClases,     l: 'Clases',         c: '#34d399' },
                { v: totalDocentes,   l: 'Docentes',       c: '#fbbf24' },
                { v: totalAlumnos,    l: 'Alumnos',        c: '#60a5fa' },
              ].map(({ v, l, c }) => (
                <div key={l} style={s.heroStat}>
                  <div style={{ ...s.heroStatVal, color: c }}>{v}</div>
                  <div style={s.heroStatLabel}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenido ── */}
      <main style={s.main}>

        {cargando ? (
          <div style={s.loading}>
            <div style={s.loadingSpinner} />
            <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem' }}>Cargando estadísticas…</p>
          </div>
        ) : (
          <>
            {/* Resumen espiritual */}
            <SectionTitle color={C_ASD}>Estado Espiritual — Resumen</SectionTitle>
            <div style={s.metricsGrid}>
              <MetricCard label="Bautizados ASD"    value={gBautizados} color={C_ASD}      bg="#eff6ff" />
              <MetricCard label="Otras Religiones"  value={gOtras}      color={C_OTRAS}    bg="#fff7ed" />
              <MetricCard label="Recién Bautizados" value={gRecientes}  color={C_RECIENTE} bg="#fdf4ff" />
              <MetricCard label="Decidió"           value={gDecidio}    color={C_DECIDIO}  bg="#f0fdf4" />
            </div>

            {/* Clases y Docentes */}
            <SectionTitle color="#14b8a6">Por Facultad</SectionTitle>
            <div style={s.grid2}>
              <ChartCard title="Clases por Facultad" accentColor="#14b8a6">
                <Bar data={barClasesData} options={barOpts()} />
              </ChartCard>
              <ChartCard title="Docentes por Facultad" accentColor="#f59e0b">
                <Bar data={barDocentesData} options={barOpts()} />
              </ChartCard>
            </div>

            {/* Distribución alumnos */}
            <SectionTitle color="#6366f1">Distribución de Alumnos</SectionTitle>
            <div style={s.grid2}>
              <ChartCard title="Distribución por Facultad" accentColor="#6366f1" height={300}>
                <Doughnut data={doughnutData} options={doughnutOpts} />
              </ChartCard>
              <ChartCard title="Alumnos por Facultad" accentColor="#3b82f6">
                <Bar data={barAlumnosData} options={barOpts()} />
              </ChartCard>
            </div>

            {/* Estado espiritual */}
            <SectionTitle color={C_RECIENTE}>Estado Espiritual por Facultad</SectionTitle>
            <ChartCard title="Bautizados · Otras religiones · Recién bautizados · Decidió" accentColor={C_RECIENTE} height={340}>
              <Bar data={barEstadoData} options={stackedOpts} />
            </ChartCard>

            {/* Por escuela dentro de facultad */}
            <SectionTitle color="#ec4899">Alumnos por Escuela — Desglose por Facultad</SectionTitle>
            <div style={s.gridFacultades}>
              {facOrdenadas.map(([facNombre, facData], fi) => {
                const color = PALETA[fi % PALETA.length]
                const escOrdenadas = Object.entries(facData.escuelas).sort((a, b) => a[0].localeCompare(b[0]))
                const escLabels   = escOrdenadas.map(([n]) => n)
                const escColores  = escLabels.map((_, i) => PALETA[(fi * 3 + i) % PALETA.length])
                const escColoresA = escColores.map(c => c + 'cc')
                const escData = {
                  labels: escLabels,
                  datasets: [{ label: 'Alumnos', data: escOrdenadas.map(([,d]) => d.alumnos), backgroundColor: escColoresA, borderColor: escColores, borderWidth: 2, borderRadius: 6 }],
                }
                return (
                  <div key={facNombre} style={sc.facCard}>
                    <div style={{ ...sc.facBand, background: color }} />
                    <div style={sc.facBody}>
                      <div style={sc.facTitle}>{facNombre}</div>
                      <div style={sc.facPills}>
                        <span style={{ ...sc.pill, background: color + '18', color }}>{facData.clases} clases</span>
                        <span style={sc.pillGray}>{facData.alumnos} alumnos</span>
                        <span style={sc.pillGray}>{facData.docentes.size} docentes</span>
                      </div>
                      <div style={{ height: 210, marginTop: '0.75rem' }}>
                        <Bar data={escData} options={barOpts()} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerMain}>© {new Date().getFullYear()} Clases Bíblicas · Universidad Peruana Unión — Juliaca</div>
        <div style={s.footerPowered}>Powered by <strong style={{ color: '#64748b' }}>Asuntos Académicos 2026</strong></div>
      </footer>

      {modalAbierto && <LoginModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}

/* ── Estilos página ── */
const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8faff' },

  /* Navbar */
  navbar: {
    background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 2px 16px rgba(29,78,216,0.3)',
  },
  navInner: {
    maxWidth: 1280, margin: '0 auto', padding: '0 1.75rem',
    height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  navLogoWrap: {
    width: 36, height: 36, borderRadius: 9,
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  navTitle: { fontWeight: 800, fontSize: '0.98rem', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2 },
  navSub:   { fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: '0.05rem' },
  btnNav:   { padding: '0.45rem 1.25rem', fontSize: '0.85rem' },

  /* Hero */
  hero: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
    padding: '3rem 1.75rem',
    position: 'relative', overflow: 'hidden',
  },
  heroInner: {
    maxWidth: 1280, margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '2rem', flexWrap: 'wrap',
  },
  heroLeft: { flex: 1, minWidth: 280 },
  heroTag: {
    display: 'inline-flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 99, padding: '0.28rem 0.85rem',
    fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    marginBottom: '1rem',
  },
  heroTitle: {
    fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
    fontWeight: 900, color: 'white', lineHeight: 1.2,
    letterSpacing: '-0.02em', marginBottom: '0.75rem',
  },
  heroDesc: {
    fontSize: '0.93rem', color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.65, maxWidth: 480,
  },
  heroStats: {
    display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 16, padding: '1.25rem 1.5rem',
    backdropFilter: 'blur(10px)',
    flexShrink: 0,
  },
  heroStat: { textAlign: 'center', padding: '0 0.75rem' },
  heroStatVal: { fontSize: '2rem', fontWeight: 900, lineHeight: 1 },
  heroStatLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' },

  /* Main */
  main: { flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '2rem 1.75rem 2.5rem' },

  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 0' },
  loadingSpinner: {
    width: 36, height: 36, borderRadius: '50%',
    border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
    animation: 'spin 0.8s linear infinite',
  },

  /* Grids */
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem', marginBottom: '2rem',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1rem', marginBottom: '2rem',
  },
  gridFacultades: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.25rem', marginBottom: '0.5rem',
  },

  /* Footer */
  footer: {
    textAlign: 'center', padding: '1.25rem',
    borderTop: '1px solid #e2e8f0', background: 'white',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  footerMain:    { fontSize: '0.8rem', color: '#94a3b8' },
  footerPowered: { fontSize: '0.74rem', color: '#cbd5e1' },
}

/* ── Estilos componentes ── */
const sc = {
  /* Metric card */
  metric: {
    borderRadius: 14, padding: '1.25rem 1rem 1rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', position: 'relative', overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  metricBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  metricValue: { fontSize: '2rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.35rem' },
  metricLabel: { fontSize: '0.78rem', color: '#64748b', fontWeight: 600 },

  /* Section title */
  secTitle: {
    fontSize: '0.78rem', fontWeight: 800, color: '#334155',
    letterSpacing: '0.05em', textTransform: 'uppercase',
    paddingLeft: '0.65rem', marginBottom: '0.9rem', marginTop: '0.25rem',
  },

  /* Chart card */
  card: {
    background: 'white', borderRadius: 16,
    padding: '1.3rem 1.4rem 1.4rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e8eef6',
  },
  cardHead: { display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '1.1rem' },
  cardAccent: { width: 4, height: 36, borderRadius: 4, flexShrink: 0, marginTop: '0.05rem' },
  cardTitle:    { fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' },
  cardSubtitle: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' },

  /* Facultad card */
  facCard: {
    background: 'white', borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e8eef6',
  },
  facBand: { height: 6 },
  facBody: { padding: '1.1rem 1.25rem 1.25rem' },
  facTitle: { fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em', marginBottom: '0.5rem' },
  facPills: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  pill: {
    display: 'inline-flex', alignItems: 'center',
    borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
    padding: '0.18rem 0.6rem',
  },
  pillGray: {
    display: 'inline-flex', alignItems: 'center',
    borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
    padding: '0.18rem 0.6rem',
    background: '#f1f5f9', color: '#475569',
  },
}
