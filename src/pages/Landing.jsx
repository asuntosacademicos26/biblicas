import { useEffect, useState, useMemo } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../config/firebase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Doughnut as DoughnutChartReal, Bar as BarChartReal } from 'react-chartjs-2'
import LoginModal from '../components/LoginModal'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

/* ==========================================================================
   CONFIGURACIONES Y CONSTANTES GLOBALES
   ========================================================================== */
const PALETA_COLORES = [
  '#2563eb', '#ea580c', '#16a34a', '#9333ea', '#ec4899',
  '#14b8a6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
  '#3b82f6', '#f97316', '#a855f7', '#fb7185', '#34d399'
]

const COLOR_ESTADO = {
  ASD: '#2563eb',
  OTRAS: '#ea580c',
  RECIENTE: '#9333ea',
  DECIDIO: '#16a34a',
}

const CONFIG_FILTROS = {
  todos: { colorActivo: '#2563eb', shadow: 'rgba(37,99,235,0.25)' },
  con_sesion: { colorActivo: '#10b981', shadow: 'rgba(16,185,129,0.25)' },
  sin_sesion: { colorActivo: '#64748b', shadow: 'rgba(100,116,139,0.25)' },
  inactivo: { colorActivo: '#ef4444', shadow: 'rgba(239,68,68,0.25)' },
}

/* ==========================================================================
   FUNCIONES AUXILIARES (HELPERS PUROS)
   ========================================================================== */
function esRecientePorFecha(fechaBautizo) {
  if (!fechaBautizo) return true
  const inicio = new Date(fechaBautizo + 'T00:00:00')
  const limite = new Date(inicio)
  limite.setMonth(limite.getMonth() + 6)
  return new Date() <= limite
}

function esAdventista(religion) {
  const r = (religion || '').toLowerCase().trim()
  return r.includes('adventis') || r.includes('asd') || r.includes('bautizad') || r.includes('séptimo') || r.includes('septimo')
}

function clasificarReligion(religion) {
  const r = (religion || '').toLowerCase().trim()
  const terminosSinReligion = [
    'ninguna', 'sin religion', 'sin religión', 'no', 'ninguno',
    'ateo', 'atea', 'agnóstico', 'agnostico', 'ninguna religion', 'sin'
  ]
  if (!r || terminosSinReligion.includes(r)) return 'sin'
  if (esAdventista(r)) return 'bautizados'
  return 'otras'
}

function obtenerMapeoOficial(escuelaRaw, facultadRaw, textoClase) {
  const e = (escuelaRaw || '').trim()
  const fDefault = (facultadRaw || 'Sin facultad').trim()
  let s = `${e} ${textoClase || ''}`.toLowerCase()

  if (s.includes('nutric')) return { escuela: 'EP Nutrición Humana', facultad: 'Facultad de Ciencias de la Salud' }
  if (s.includes('enfermer')) return { escuela: 'EP Enfermería', facultad: 'Facultad de Ciencias de la Salud' }
  if (s.includes('psicolog')) return { escuela: 'EP Psicología', facultad: 'Facultad de Ciencias de la Salud' }

  if (s.includes('sistemas')) return { escuela: 'EP Ingeniería de Sistemas', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (s.includes('civil')) return { escuela: 'EP Ingeniería Civil', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (s.includes('ambiental')) return { escuela: 'EP Ingeniería Ambiental', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (s.includes('urbanismo') || s.includes('arquitectura y urb')) return { escuela: 'Arquitectura y Urbanismo', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (s.includes('arquitectura')) return { escuela: 'EP Arquitectura', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (s.includes('alimentar') || s.includes('industrías') || s.includes('industias')) return { escuela: 'EP Ingeniería de Industrías Alimentarías', facultad: 'Facultad de Ingeniería y Arquitectura' }

  if (s.includes('administración') || s.includes('administracion')) {
    const tieneSeccion = s.includes('seccion 10') || s.includes('sección 10')
    const tieneNegocios = s.includes('negicios') || s.includes('negocios') || s.includes('internac')
    if (tieneSeccion && tieneNegocios) return { escuela: 'EP Administración y Negocios Internacionales - Seccion 10', facultad: 'Facultad de Ciencias Empresariales' }
    if (tieneSeccion) return { escuela: 'EP Administración - Seccion 10', facultad: 'Facultad de Ciencias Empresariales' }
    return { escuela: 'EP Administración y Negocios Internacionales', facultad: 'Facultad de Ciencias Empresariales' }
  }
  if (s.includes('contabil')) {
    if (s.includes('seccion 10') || s.includes('sección 10')) return { escuela: 'EP de Contabilidad y Gestión Tributaria - Seccion 10', facultad: 'Facultad de Ciencias Empresariales' }
    if (s.includes('aduanera')) return { escuela: 'Contabilidad, gestión tributaria y aduanera', facultad: 'Facultad de Ciencias Empresariales' }
    return { escuela: 'EP de Contabilidad y Gestión Tributaria', facultad: 'Facultad de Ciencias Empresariales' }
  }

  if (s.includes('inicial') || s.includes('puericult')) return { escuela: 'Educación Inicial y Puericultura', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('primaria y pedag') || s.includes('terapeut')) return { escuela: 'Educación, Especialidad Primaria y Pedagogía Terapeútica', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('primaria') || s.includes('primaría')) return { escuela: 'EP Educación: Especialidad Primaría', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('linguistica e ingl') || s.includes('lingüística e ingl')) return { escuela: 'EP Educación: Especialidad Lingüistica e Inglés', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('literatura') || s.includes('lingüística y liter') || s.includes('linguistica y liter')) return { escuela: 'EP Educación: Especialidad de Lingüística y Literatura', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('derecho')) return { escuela: 'EP Derecho', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('inglés y esp') || s.includes('ingles y esp')) return { escuela: 'Educación, Especialidad Inglés y Español', facultad: 'Facultad de Ciencias Humanas y Educación' }
  if (s.includes('física') || s.includes('fisica') || s.includes('deportes') || s.includes('recreaci')) return { escuela: 'Educación, especialidad Educación Física, Recreación y Deportes', facultad: 'Facultad de Ciencias Humanas y Educación' }

  if (fDefault.includes('Ingeniería') || fDefault.includes('Arquitectura')) return { escuela: 'EP Ingeniería de Sistemas', facultad: 'Facultad de Ingeniería y Arquitectura' }
  if (fDefault.includes('Salud')) return { escuela: 'EP Enfermería', facultad: 'Facultad de Ciencias de la Salud' }
  if (fDefault.includes('Empresariales')) return { escuela: 'EP de Contabilidad y Gestión Tributaria', facultad: 'Facultad de Ciencias Empresariales' }

  return { escuela: 'Educación Inicial y Puericultura', facultad: 'Facultad de Ciencias Humanas y Educación' }
}

const getDoughnutOpts = () => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#0f172a', titleColor: '#f8fafc', bodyColor: '#94a3b8', padding: 14, cornerRadius: 10 },
  },
})

const getBarOpts = () => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      padding: 12,
      cornerRadius: 10,
      callbacks: {
        label: function(context) {
          return `Clases bíblicas: ${context.raw}`;
        }
      }
    }
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#64748b', font: { size: 10, weight: '600' } }, grid: { color: '#f1f5f9' } },
    x: { ticks: { color: '#475569', font: { size: 10, weight: '700' }, autoSkip: false, maxRotation: 45, minRotation: 45 }, grid: { display: false } }
  }
})

/* ==========================================================================
   COMPONENTES INTERNOS REUTILIZABLES
   ========================================================================== */
function MetricCard({ label, value, color, bg, icon }) {
  return (
    <div style={{ ...sc.metric, background: bg, border: `1px solid ${color}1d` }}>
      <div style={{ ...sc.metricIconContainer, color: color, background: `${color}10` }}>
        {icon}
      </div>
      <div style={sc.metricContent}>
        <div style={{ ...sc.metricValue, color: '#0f172a' }}>{value ?? '—'}</div>
        <div style={sc.metricLabel}>{label}</div>
      </div>
      <div style={{ ...sc.metricIndicatorBar, background: color }} />
    </div>
  )
}

function SectionTitle({ children, color = '#6366f1' }) {
  return (
    <div style={sc.secTitleContainer}>
      <div style={{ ...sc.secTitleIndicator, background: color }} />
      <h2 style={sc.secTitleText}>{children}</h2>
    </div>
  )
}

/* COMPONENTE DE FICHA EXPANSIVA CORREGIDO CONTRA DESBORDAMIENTOS LATERALES */
function FichaEscuelaCard({ nombre, total, color }) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={nombre}
      style={{ 
        ...sc.btnEscuelaFicha, 
        borderLeft: `4px solid ${color}`, 
        background: '#ffffff',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered ? '0 10px 20px rgba(15,23,42,0.08)' : '0 1px 2px rgba(0,0,0,0.01)',
        borderColor: isHovered ? color : '#e2e8f0',
        alignItems: isHovered ? 'flex-start' : 'center', // Se expande elegantemente hacia abajo
        zIndex: isHovered ? 10 : 1,
        position: 'relative',
        minWidth: 0, // Evita desborde horizontal en contenedores grid
        width: '100%',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1, width: '100%' }}>
        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0, marginTop: isHovered ? '0.2rem' : 0 }} />
        <span style={{ 
          fontSize: '0.74rem', 
          fontWeight: '800', 
          color: isHovered ? '#1e293b' : '#475569', 
          textTransform: 'uppercase', 
          textOverflow: isHovered ? 'unset' : 'ellipsis', 
          overflow: isHovered ? 'visible' : 'hidden', 
          whiteSpace: isHovered ? 'normal' : 'nowrap', // Aquí se rompe hacia abajo en hover
          lineHeight: 1.3,
          width: '100%',
          display: 'block',
          wordBreak: 'break-word'
        }}>
          {nombre}
        </span>
      </div>
      <div style={{ fontSize: '1.05rem', fontWeight: '900', color: color, paddingLeft: '0.65rem', flexShrink: 0, marginTop: isHovered ? '0.05rem' : 0 }}>
        {total}
      </div>
    </div>
  )
}

function EscuelaRecientesCard({ item, color }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        ...sc.escuelaRecienteCardBox,
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={sc.escuelaRecienteLeft}>
        <div style={sc.escienteIconCircle}>🎓</div>
        <div style={sc.escuelaRecienteName} title={item.escuela}>{item.escuela}</div>
      </div>
      
      <div style={{ ...sc.escuelaRecienteCounter, background: `${color}15`, color: color }}>
        +{item.totalRecientes}
      </div>

      {showTooltip && (
        <div style={sc.escuelaRecienteTooltipBubble}>
          <div style={sc.tooltipBubbleHeader}>Desglose de Clases Bíblicas Participantes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {item.clases.map((clase, i) => (
              <div key={i} style={sc.tooltipClaseRow}>
                <span style={sc.tooltipClaseName}>📖 {clase.nombre}</span>
                <span style={{ ...sc.tooltipClaseBadge, background: color }}>{clase.count}</span>
              </div>
            ))}
          </div>
          <div style={sc.tooltipArrowBottom} />
        </div>
      )}
    </div>
  )
}

function ReporteMaestroCard({ item, index }) {
  const [isHovered, setIsHovered] = useState(false)
  
  const esSinClase = item.clase === 'Sin clase asignada'
  const esCeroSesiones = item.clase !== 'Sin clase asignada' && item.sesiones === 0
  const esEnCurso = item.sesiones > 0 && item.sesiones < 8
  const esCompleta = item.sesiones >= 8

  let fondoDefault = 'rgba(255, 255, 255, 1)'
  let borderColorDefault = '#e2e8f0'
  let opacityDefault = 1
  let dotColor = '#94a3b8'
  let numeroColor = '#2563eb'

  if (esSinClase) {
    fondoDefault = 'rgba(239, 68, 68, 0.03)'; borderColorDefault = '#fee2e2'; opacityDefault = 0.75; dotColor = '#f87171'; numeroColor = '#ef4444'
  } else if (esCeroSesiones) {
    fondoDefault = 'rgba(99, 102, 241, 0.04)'; borderColorDefault = '#e2e8f0'; opacityDefault = 0.9; dotColor = '#94a3b8'; numeroColor = '#6366f1'
  } else if (esEnCurso) {
    fondoDefault = 'rgba(14, 165, 233, 0.07)'; borderColorDefault = '#bae6fd'; opacityDefault = 1; dotColor = '#10b981'; numeroColor = '#0284c7'
  } else if (esCompleta) {
    fondoDefault = 'rgba(249, 115, 22, 0.06)'; borderColorDefault = '#f97316'; opacityDefault = 1; dotColor = '#f97316'; numeroColor = '#ea580c'
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...s.reportCard, background: isHovered ? '#eff6ff' : fondoDefault,
        borderColor: isHovered ? (esCompleta ? '#ea580c' : (esSinClase ? '#ef4444' : '#2563eb')) : borderColorDefault,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 4px 12px rgba(37,99,235,0.08)' : (esCompleta ? '0 2px 6px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.01)'),
        opacity: isHovered ? 1 : opacityDefault,
        animation: (esCompleta && !isHovered) ? 'efectoFuegoAura 2.2s infinite ease-in-out' : 'none',
        transition: 'all 0.15s ease-in-out'
      }}
    >
      <h3 style={s.cardClaseTitle}>
        <span style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0, flex: 1, paddingRight: '0.4rem' }}>
          <span style={{ ...s.cardNumber, color: numeroColor }}>{index + 1}.</span>
          <span style={{ textOverflow: isHovered ? 'unset' : 'ellipsis', overflow: isHovered ? 'visible' : 'hidden', whiteSpace: isHovered ? 'normal' : 'nowrap', minWidth: 0, lineHeight: 1.3, wordBreak: 'break-word' }} title={item.clase}>
            {item.clase}
          </span>
        </span>
        <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '0.22rem', boxShadow: esCompleta ? '0 0 6px #f97316' : 'none' }} />
      </h3>

      {isHovered && (
        <div style={s.tooltipBubble}>
          <div>
            <span style={s.cardTeacherLabel}>Docente</span>
            <h4 style={s.cardDocenteTooltip}>{item.docente}</h4>
          </div>
          <div>
            <span style={s.cardTeacherLabel}>Lección Elegida</span>
            <h4 style={{ ...s.cardDocenteTooltip, fontWeight: '600', color: '#60a5fa', fontSize: '0.76rem' }}>{item.leccion}</h4>
          </div>
          <div style={{ ...sc.cardBadgeTooltip, background: esCompleta ? 'linear-gradient(135deg, #f97316, #ef4444)' : (esSinClase ? '#ef4444' : (item.sesiones > 0 ? '#10b981' : '#64748b')), boxShadow: esCompleta ? '0 2px 6px rgba(249,115,22,0.3)' : 'none' }}>
            {esSinClase ? 'Inactivo ❌' : `${item.sesiones}/8 ${item.sesiones === 1 ? 'sesión' : 'sesiones'} ${esCompleta ? '🔥' : ''}`}
          </div>
          <div style={s.tooltipArrow} />
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   COMPONENTE PRINCIPAL (LANDING)
   ========================================================================== */
export default function Landing() {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [clases,      setClases]      = useState(null)
  const [usuarios,    setUsuarios]    = useState([])
  const [facultades,  setFacultades]  = useState([])
  const [dataAlumnos, setDataAlumnos] = useState([])
  const [lecciones,   setLecciones]   = useState(null)
  
  const [filtroSesiones, setFiltroSesiones] = useState('con_sesion')
  const [hoveredBtn, setHoveredBtn] = useState(null)
  const [facultadFiltroEscuela, setFacultadFiltroEscuela] = useState('TODAS')
  const [facultadFiltroTotal, setFacultadFiltroTotal] = useState('TODAS')

  // Subscripciones en tiempo real a Firebase
  useEffect(() => {
    const desubscribirClases = onValue(ref(db, 'clases'), snap => {
      if (!snap.exists()) { setClases([]); return }
      setClases(Object.entries(snap.val()).map(([id, d]) => ({
        id, ...d,
        alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
        alumnosRaw: d.alumnos || {},
      })))
    })

    const desubscribirUsuarios = onValue(ref(db, 'usuarios'), snap => {
      if (!snap.exists()) { setUsuarios([]); return }
      setUsuarios(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
    })

    const desubscribirFacultades = onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      setFacultades(Object.values(snap.val()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
    })

    const desubscribirDataAlumnos = onValue(ref(db, 'dataAlumnos'), snap => {
      if (!snap.exists()) { setDataAlumnos([]); return }
      setDataAlumnos(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
    })

    const desubscribirLecciones = onValue(ref(db, 'leccionesBiblicas'), snap => {
      if (!snap.exists()) { setLecciones({}); return }
      setLecciones(snap.val())
    })

    return () => {
      desubscribirClases(); desubscribirUsuarios(); desubscribirFacultades(); desubscribirDataAlumnos(); desubscribirLecciones()
    }
  }, [])

  /* ── 📊 USEMEMO: PROCESAMIENTO CUANTITATIVO DE AULAS/CLASES APERTURADAS ── */
  const dataClasesPorEstructura = useMemo(() => {
    if (!clases || !facultades) return { escuelas: [], facultades: [], barChartData: null }

    const conteoEscuelas = {}
    const conteoFacultades = {}

    facultades.forEach(f => { conteoFacultades[f.nombre] = 0 })

    clases.forEach(c => {
      const facClase = (c.facultad || 'Sin facultad').trim()
      const escClase = (c.escuela || 'Sin escuela').trim()
      const textoClaseContexto = `${c.nombre || ''} ${c.nombreClase || ''} ${c.clase || ''}`

      const { escuela, facultad } = obtenerMapeoOficial(escClase, facClase, textoClaseContexto)

      if (escuela !== 'SIN ESCUELA') {
        conteoEscuelas[escuela] = (conteoEscuelas[escuela] || 0) + 1
      }
      
      if (conteoFacultades[facultad] !== undefined) {
        conteoFacultades[facultad]++
      } else {
        conteoFacultades[facultad] = 1
      }
    })

    const listaEscuelas = Object.entries(conteoEscuelas)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)

    const listaFacultades = Object.entries(conteoFacultades)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)

    const barChartData = {
      labels: listaEscuelas.map(e => e.nombre),
      datasets: [{
        data: listaEscuelas.map(e => e.total),
        backgroundColor: listaEscuelas.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length] + 'dd'),
        borderColor: listaEscuelas.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length]),
        borderWidth: 1.5,
        borderRadius: 8,
        hoverBackgroundColor: listaEscuelas.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length])
      }]
    }

    return { escuelas: listaEscuelas, facultades: listaFacultades, barChartData }
  }, [clases, facultades])

  /* ── 📊 PROCESAMIENTO CENTRAL DE ALUMNOS CON REDISTRIBUCIÓN CONTEXTUAL ── */
  const globalDataYGraficos = useMemo(() => {
    if (!clases || !facultades || !dataAlumnos) return null

    const totalClases     = clases.length
    const totalDocentes   = new Set(clases.map(c => c.docenteId).filter(Boolean)).size
    const totalFacultades = facultades.length

    const sanearID = (val) => val !== undefined && val !== null ? String(val).trim().replace(/^0+/, '').toLowerCase() : ''

    const escuelasAcumuladasMap = new Map()
    const alumnosUnicosActivos = new Map()

    clases.forEach(c => {
      const facClase = (c.facultad || 'Sin facultad').trim()
      const escClase = (c.escuela || 'Sin escuela').trim()
      const textoClaseContexto = `${c.nombre || ''} ${c.nombreClase || ''} ${c.clase || ''}`

      Object.values(c.alumnosRaw || {}).forEach(alumnoInscrito => {
        const idUnico = sanearID(alumnoInscrito.codigoEstudiante || alumnoInscrito.dni || alumnoInscrito.id)
        if (!idUnico) return

        const matchPadron = dataAlumnos.find(d => {
          const dniM = sanearID(d.dni);   const dniA = sanearID(alumnoInscrito.dni)
          const codM = sanearID(d.codigoEstudiante || d.codigo); const codA = sanearID(alumnoInscrito.codigoEstudiante || alumnoInscrito.codigo)
          return (dniA && dniM === dniA) || (codA && codM === codA)
        })

        const escuelaOriginal = matchPadron?.escuela || alumnoInscrito.escuela || escClase
        const facultadOriginal = matchPadron?.facultad || alumnoInscrito.facultad || facClase

        const { escuela, facultad } = obtenerMapeoOficial(escuelaOriginal, facultadOriginal, textoClaseContexto)

        const religion = (matchPadron?.religion || alumnoInscrito.religion || '').trim()
        const programme = alumnoInscrito.programaBautizo || ''

        const existente = alumnosUnicosActivos.get(idUnico)
        let programmeFinal = programme || existente?.programa || ''
        if (existente && existente.programa === 'Se bautizó') {
          programmeFinal = 'Se bautizó'
        }

        alumnosUnicosActivos.set(idUnico, {
          facReal: facultad,
          escReal: escuela,
          programa: programmeFinal,
          fechaBautizo: alumnoInscrito.fechaBautizo || existente?.fechaBautizo || '',
          religion
        })
      })
    })

    const porFacultad = {}
    facultades.forEach(f => {
      porFacultad[f.nombre] = {
        clases: 0, alumnos: 0, docentes: new Set(),
        bautizados: 0, otras: 0, recientes: 0, decidio: 0, escuelas: {},
      }
    })

    clases.forEach(c => {
      const facClase = (c.facultad || 'Sin facultad').trim()
      if (porFacultad[facClase]) {
        porFacultad[facClase].clases++
        if (c.docenteId) porFacultad[facClase].docentes.add(c.docenteId)
      }
    })

    let gBautizados = 0, gOtras = 0, gRecientes = 0, gDecidio = 0

    alumnosUnicosActivos.forEach(datos => {
      /* SOLUCIÓN AL BUG DETECTADO: Usamos 'programa' en lugar del obsoleto 'programme' */
      const { facReal, escReal, programa, fechaBautizo, religion } = datos

      let esReciente = false
      let esBautizado = false
      let esOtras = false
      let esDecidio = (programa === 'Decidió')

      if (programa === 'Se bautizó') {
        if (esRecientePorFecha(fechaBautizo)) esReciente = true
        else esBautizado = true
      } else {
        const cat = clasificarReligion(religion)
        if (cat === 'bautizados') esBautizado = true
        else if (cat === 'otras') esOtras = true
      }

      if (esReciente) gRecientes++
      else if (esBautizado) gBautizados++
      else if (esOtras) gOtras++
      if (esDecidio) gDecidio++

      if (porFacultad[facReal]) {
        porFacultad[facReal].alumnos++
        if (esReciente) porFacultad[facReal].recientes++
        else if (esBautizado) porFacultad[facReal].bautizados++
        else if (esOtras) porFacultad[facReal].otras++
        if (esDecidio) porFacultad[facReal].decidio++

        if (!porFacultad[facReal].escuelas[escReal]) {
          porFacultad[facReal].escuelas[escReal] = { alumnos: 0 }
        }
        porFacultad[facReal].escuelas[escReal].alumnos++
      }

      if (esBautizado || esReciente) {
        const llaveCompuesta = `${facReal}|||${escReal}`
        if (!escuelasAcumuladasMap.has(llaveCompuesta)) {
          escuelasAcumuladasMap.set(llaveCompuesta, {
            escuela: escReal,
            facultad: facReal,
            bautizados: 0,
            recientes: 0,
            totalASD: 0,
            alumnos: 0
          })
        }
        const refEsc = escuelasAcumuladasMap.get(llaveCompuesta)
        if (refEsc) {
          if (esBautizado) refEsc.bautizados++
          if (esReciente) refEsc.recientes++
          refEsc.totalASD = refEsc.bautizados + refEsc.recientes
          refEsc.alumnos++
        }
      }
    })

    const listaEscuelasGlobal = Array.from(escuelasAcumuladasMap.values())
      .filter(e => e.escuela !== 'SIN ESCUELA' && e.totalASD > 0)
      .sort((a, b) => b.totalASD - a.totalASD)

    const facOrdenadas = Object.entries(porFacultad).sort((a, b) => {
      const ai = facultades.findIndex(f => f.nombre === a[0])
      const bi = facultades.findIndex(f => f.nombre === b[0])
      if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

    return {
      totalClases, totalAlumnos: alumnosUnicosActivos.size, totalDocentes, totalFacultades,
      gBautizados, gOtras, gRecientes, gDecidio, facOrdenadas, listaEscuelasGlobal
    }
  }, [clases, facultades, dataAlumnos])

  const escuelasFiltradasLista = useMemo(() => {
    if (!globalDataYGraficos) return []
    const base = globalDataYGraficos.listaEscuelasGlobal

    if (facultadFiltroEscuela === 'TODAS') {
      return base
    }
    return base.filter(esc => esc.facultad.toUpperCase().trim() === facultadFiltroEscuela.toUpperCase().trim())
  }, [globalDataYGraficos, facultadFiltroEscuela])

  const doughnutEscuelasData = useMemo(() => {
    if (facultadFiltroEscuela === 'TODAS') {
      const mapaAgrupado = new Map()
      escuelasFiltradasLista.forEach(e => {
        const acum = mapaAgrupado.get(e.facultad) || 0
        mapaAgrupado.set(e.facultad, acum + e.totalASD)
      })
      const labels = Array.from(mapaAgrupado.keys())
      const data = Array.from(mapaAgrupado.values())
      return {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length] + 'dd'),
          borderColor: labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length]),
          borderWidth: 1.5,
          hoverOffset: 12
        }]
      }
    } else {
      const labels = escuelasFiltradasLista.map(e => e.escuela)
      const data = escuelasFiltradasLista.map(e => e.totalASD)
      return {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length] + 'dd'),
          borderColor: labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length]),
          borderWidth: 1.5,
          hoverOffset: 12
        }]
      }
    }
  }, [escuelasFiltradasLista, facultadFiltroEscuela])

  const totalesFiltradosTabla = useMemo(() => {
    return escuelasFiltradasLista.reduce((acc, curr) => {
      acc.bautizados += curr.bautizados
      acc.recientes += curr.recientes
      acc.totalASD += curr.totalASD
      return acc
    }, { bautizados: 0, recientes: 0, totalASD: 0 })
  }, [escuelasFiltradasLista])

  /* ── 📊 LOGICA REPORTE: TOTAL ALUMNOS PARTICIPANTES ── */
  const totalEscuelasLista = useMemo(() => {
    if (!globalDataYGraficos) return []
    const lista = []

    globalDataYGraficos.facOrdenadas.forEach(([facNombre, facData]) => {
      Object.entries(facData.escuelas).forEach(([escNombre, escData]) => {
        lista.push({
          escuela: escNombre,
          facultad: facNombre,
          totalAlumnos: escData.alumnos
        })
      })
    })

    lista.sort((a, b) => b.totalAlumnos - a.totalAlumnos)
    if (facultadFiltroTotal === 'TODAS') return lista
    return lista.filter(e => e.facultad.toUpperCase().trim() === facultadFiltroTotal.toUpperCase().trim())
  }, [globalDataYGraficos, facultadFiltroTotal])

  const doughnutTotalParticipantesData = useMemo(() => {
    if (!globalDataYGraficos) return { labels: [], datasets: [] }

    if (facultadFiltroTotal === 'TODAS') {
      const labels = globalDataYGraficos.facOrdenadas.map(([n]) => n)
      const data = globalDataYGraficos.facOrdenadas.map(([, d]) => d.alumnos)
      const colores = labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length])
      return {
        labels: labels.map((l, i) => `${l}  ·  ${data[i]}`),
        datasets: [{
          data: data,
          backgroundColor: colores.map(c => c + 'dd'),
          borderColor: colores,
          borderWidth: 1.5,
          hoverOffset: 12
        }]
      }
    } else {
      const labels = totalEscuelasLista.map(e => e.escuela)
      const data = totalEscuelasLista.map(e => e.totalAlumnos)
      const colores = labels.map((_, i) => PALETA_COLORES[i % PALETA_COLORES.length])
      return {
        labels: labels.map((l, i) => `${l}  ·  ${data[i]}`),
        datasets: [{
          data: data,
          backgroundColor: colores.map(c => c + 'dd'),
          borderColor: colores,
          borderWidth: 1.5,
          hoverOffset: 12
        }]
      }
    }
  }, [globalDataYGraficos, totalEscuelasLista, facultadFiltroTotal])

  /* ── 📊 LÓGICA DE AGRUPACIÓN EXPONENCIAL POR ESCUELAS ── */
  const escuelasRecientesAgrupadas = useMemo(() => {
    if (!clases || !dataAlumnos) return []
    const mapaEscuelas = new Map()
    const sanearID = (val) => val !== undefined && val !== null ? String(val).trim().replace(/^0+/, '').toLowerCase() : ''
    const filtradosVistos = new Set()

    clases.forEach(c => {
      const facClase = (c.facultad || 'Sin facultad').trim()
      const escClase = (c.escuela || 'Sin escuela').trim()
      const textoClaseContexto = `${c.nombre || ''} ${c.nombreClase || ''} ${c.clase || ''}`
      const nombreClase = c.nombre || c.nombreClase || c.clase || 'Clase sin nombre'

      Object.values(c.alumnosRaw || {}).forEach(alumnoInscrito => {
        const idUnico = sanearID(alumnoInscrito.codigoEstudiante || alumnoInscrito.dni || alumnoInscrito.id)
        if (!idUnico) return

        const matchPadron = dataAlumnos.find(d => {
          const dniM = sanearID(d.dni); const dniA = sanearID(alumnoInscrito.dni)
          const codM = sanearID(d.codigoEstudiante || d.codigo); const codA = sanearID(alumnoInscrito.codigoEstudiante || alumnoInscrito.codigo)
          return (dniA && dniM === dniA) || (codA && codM === codA)
        })

        const programme = alumnoInscrito.programaBautizo || ''
        const fechaBautizo = alumnoInscrito.fechaBautizo || ''

        if (programme === 'Se bautizó' && esRecientePorFecha(fechaBautizo)) {
          const escuelaOriginal = matchPadron?.escuela || alumnoInscrito.escuela || escClase
          const facultadOriginal = matchPadron?.facultad || alumnoInscrito.facultad || facClase
          const { escuela } = obtenerMapeoOficial(escuelaOriginal, facultadOriginal, textoClaseContexto)

          const llaveFicha = `${idUnico}-${nombreClase}`
          if (!filtradosVistos.has(llaveFicha)) {
            filtradosVistos.add(llaveFicha)
            
            if (!mapaEscuelas.has(escuela)) {
              mapaEscuelas.set(escuela, {
                escuela: escuela,
                totalRecientes: 0,
                clasesInternas: new Map()
              })
            }
            
            const registro = mapaEscuelas.get(escuela)
            registro.totalRecientes++
            
            const conteoClase = registro.clasesInternas.get(nombreClase) || 0
            registro.clasesInternas.set(nombreClase, conteoClase + 1)
          }
        }
      })
    })

    return Array.from(mapaEscuelas.values()).map(e => ({
      escuela: e.escuela,
      totalRecientes: e.totalRecientes,
      clases: Array.from(e.clasesInternas.entries()).map(([nombre, count]) => ({
        nombre,
        count
      })).sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.totalRecientes - a.totalRecientes)
  }, [clases, dataAlumnos])

  /* ── 📋 MAPEO DE HISTORIAL DE MAESTROS DESGLOSADO POR AULA ÚNICA ── */
  const maestrosReporte = useMemo(() => {
    if (!usuarios || !clases || !lecciones) return []
    
    const list = []
    const verificarIDLeccion = (idPotencial) => {
      if (!idPotencial || typeof idPotencial !== 'string') return null
      const limpio = idPotencial.trim()
      const encontrado = lecciones[limpio] || lecciones['-' + limpio] || lecciones[limpio.replace(/^-/, '')]
      return encontrado ? (encontrado.titulo || 'Sin título') : null
    }

    usuarios.forEach(u => {
      const susClases = clases.filter(c => c.docenteId === u.id)
      
      if (susClases.length === 0) {
        list.push({
          id: `no-class-${u.id}`,
          docente: u.nombreCompleto || u.username || 'Usuario sin nombre',
          clase: 'Sin clase asignada',
          leccion: 'Sin lección seleccionada',
          sesiones: 0
        })
      } else {
        susClases.forEach(c => {
          const nombreClase = c.nombre || c.nombreClase || c.clase || 'Clase sin nombre'
          let tituloHallado = verificarIDLeccion(c.leccionId || c.idLeccion || c.leccion || c.leccionBiblica || c.leccionActualId || u.leccionActualId || u.leccionId || u.idLeccion || u.leccion || u.leccionElegida)

          if (!tituloHallado) {
            const llaveClase = Object.values(c).find(val => verificarIDLeccion(val))
            if (llaveClase) tituloHallado = verificarIDLeccion(llaveClase)
          }

          if (!tituloHallado) {
            const llaveUsuario = Object.values(u).find(val => verificarIDLeccion(val))
            if (llaveUsuario) tituloHallado = verificarIDLeccion(llaveUsuario)
          }

          const nombreLeccion = tituloHallado || c.leccion || c.nombreLeccion || 'Sin lección seleccionada'
          const totalSesionesRealizadas = c.asistencias ? Object.keys(c.asistencias).length : 0

          list.push({
            id: `${u.id}-${c.id}`,
            docente: u.nombreCompleto || u.username || 'Usuario sin nombre',
            clase: nombreClase,
            leccion: nombreLeccion,
            sesiones: totalSesionesRealizadas
          })
        })
      }
    })

    return list.sort((a, b) => {
      if (b.sesiones !== a.sesiones) return b.sesiones - a.sesiones
      const noClassA = a.clase === 'Sin clase asignada'
      const noClassB = b.clase === 'Sin clase asignada'
      if (noClassA && !noClassB) return 1
      if (!noClassA && noClassB) return -1
      return a.clase.toLowerCase().localeCompare(b.clase.toLowerCase())
    })
  }, [usuarios, clases, lecciones])

  /* LOGICA DE FILTRADO CORREGIDA EN SEGMENTACIONES */
  const totalTodos      = maestrosReporte.length
  const totalConSesion  = maestrosReporte.filter(m => m.sesiones > 0 && m.clase !== 'Sin clase asignada').length
  const totalSinSesion  = maestrosReporte.filter(m => m.sesiones === 0 && m.clase !== 'Sin clase asignada').length
  const totalInactivos  = maestrosReporte.filter(m => m.clase === 'Sin clase asignada').length

  const maestrosFiltrados = useMemo(() => {
    return maestrosReporte.filter(item => {
      if (filtroSesiones === 'con_sesion') return item.sesiones > 0 && item.clase !== 'Sin clase asignada'
      if (filtroSesiones === 'sin_sesion') return item.sesiones === 0 && item.clase !== 'Sin clase asignada'
      if (filtroSesiones === 'inactivo') return item.clase === 'Sin clase asignada'
      return true
    })
  }, [maestrosReporte, filtroSesiones])

  const cargando = clases === null || globalDataYGraficos === null || lecciones === null

  const getFiltroBtnStyle = (tipo) => {
    const esActivo = filtroSesiones === tipo
    const esHovered = hoveredBtn === tipo
    const implicado = esActivo || esHovered 
    let background = '#ffffff', color = '#475569', borderColor = '#cbd5e1', shadow = 'none'
    const fontWeight = (tipo === 'todos') ? '800' : '700'
    const config = CONFIG_FILTROS[tipo]

    if (config) {
      if (tipo === 'todos' && esActivo) { background = config.colorActivo; borderColor = config.colorActivo; color = '#ffffff'; shadow = `0 2px 8px ${config.shadow}` }
      else if (tipo !== 'todos' && implicado) { background = config.colorActivo; borderColor = config.colorActivo; color = '#ffffff'; if (esActivo) shadow = `0 2px 8px ${config.shadow}` }
    }
    return { padding: '0.38rem 0.85rem', fontSize: '0.74rem', fontWeight, borderRadius: '8px', border: '1px solid', borderColor, background, color, cursor: 'pointer', transition: 'all 0.12s ease-in-out', boxShadow: shadow }
  }

  return (
    <div style={s.page}>
      
      <style>{`
        @keyframes efectoFuegoAura {
          0% { box-shadow: 0 0 4px rgba(249,115,22,0.4), 0 0 8px rgba(239,68,68,0.2); border-color: #f97316; }
          50% { box-shadow: 0 0 14px rgba(251,191,36,0.75), 0 0 22px rgba(249,115,22,0.5); border-color: #fbbf24; }
          100% { box-shadow: 0 0 4px rgba(249,115,22,0.4), 0 0 8px rgba(239,68,68,0.2); border-color: #f97316; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={s.navbar}>
        <div style={s.navInner}>
          <div style={s.navBrand}>
            <div style={s.navLogoWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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

      {/* Hero Header Banner */}
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
                { v: globalDataYGraficos.totalFacultades, l: 'Facultades', c: '#a78bfa' },
                { v: globalDataYGraficos.totalClases,     l: 'Clases',         c: '#34d399' },
                { v: globalDataYGraficos.totalDocentes,   l: 'Docentes',       c: '#fbbf24' },
                { v: globalDataYGraficos.totalAlumnos,    l: 'Alumnos',        c: '#60a5fa' },
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

      {/* Contenido Dinámico Principal */}
      <main style={s.main}>
        {cargando ? (
          <div style={s.loading}>
            <div style={s.loadingSpinner} />
            <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem' }}>Cargando estadísticas…</p>
          </div>
        ) : (
          <>
            {/* Sección: Resumen Espiritual (AHORA MOSTRANDO LOS DATOS COMPILADOS REALES) */}
            <SectionTitle color={COLOR_ESTADO.ASD}>✝️ Estado Espiritual — Resumen</SectionTitle>
            <div style={s.metricsGrid}>
              <MetricCard label="Bautizados ASD" value={globalDataYGraficos.gBautizados} color={COLOR_ESTADO.ASD} bg="#f0f6ff" icon="⛪" />
              <MetricCard label="Otras Religiones" value={globalDataYGraficos.gOtras} color={COLOR_ESTADO.OTRAS} bg="#fffaf5" icon="🌐" />
              <MetricCard label="Recién Bautizados" value={globalDataYGraficos.gRecientes} color={COLOR_ESTADO.RECIENTE} bg="#fdf6ff" icon="✨" />
              <MetricCard label="Decidió" value={globalDataYGraficos.gDecidio} color={COLOR_ESTADO.DECIDIO} bg="#f5fdf8" icon="🔥" />
            </div>

            {/* GRÁFICO EDUCATIVO MODULAR DE RECIÉN BAUTIZADOS AGRUPADO POR ESCUELAS */}
            <SectionTitle color="#9333ea">🕊️ Alumnos Recién Bautizados por Escuela Profesional</SectionTitle>
            
            <div style={{ ...sc.card, marginBottom: '2.5rem', background: '#ffffff' }}>
              
              {escuelasRecientesAgrupadas.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0', fontStyle: 'italic' }}>
                  No se registran conversiones en los últimos meses.
                </p>
              ) : (
                <div style={sc.escuelasRecientesGridCards}>
                  {escuelasRecientesAgrupadas.map((item, idx) => {
                    const colorFicha = PALETA_COLORES[idx % PALETA_COLORES.length]
                    return (
                      <EscuelaRecientesCard 
                        key={idx} 
                        item={item} 
                        color={colorFicha} 
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* REPORTE DE TOTALES POR ESCUELA PROFESIONAL (COMPACTADO EN DOS COLUMNAS ULTRA ESTABLES) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <SectionTitle color="#ea580c">👥 Población Adventista Total por Escuela Profesional</SectionTitle>
              <div style={sc.counterBadgeGlobal}>
                Universo General: <strong>{globalDataYGraficos.gBautizados + globalDataYGraficos.gRecientes}</strong> Alumnos ASD ⛪
              </div>
            </div>

            <div style={{ ...sc.card, marginBottom: '2.5rem' }}>
              <div style={{ ...s.reportHeaderRow, marginTop: 0, marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['TODAS', ...globalDataYGraficos.facOrdenadas.map(([n]) => n)]
                    .filter(facBtn => facBtn !== 'Faculty Computer Science')
                    .map(facBtn => (
                      <button
                        key={facBtn} onClick={() => setFacultadFiltroEscuela(facBtn)}
                        style={{
                          padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', borderRadius: '6px',
                          cursor: 'pointer', border: '1px solid', transition: 'all 0.15s ease',
                          background: facultadFiltroEscuela === facBtn ? '#ea580c' : '#ffffff',
                          borderColor: facultadFiltroEscuela === facBtn ? '#ea580c' : '#e2e8f0',
                          color: facultadFiltroEscuela === facBtn ? '#ffffff' : '#64748b',
                          boxShadow: facultadFiltroEscuela === facBtn ? '0 2px 6px rgba(234,88,12,0.2)' : 'none'
                        }}
                      >
                        {facBtn}
                      </button>
                    ))}
                </div>
              </div>

              {escuelasFiltradasLista.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '4rem 0', fontStyle: 'italic' }}>
                  No hay alumnos adventistas activos para mostrar en este segmento.
                </p>
              ) : (
                <div style={s.layoutGridImagen}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <DoughnutChartReal data={doughnutEscuelasData} options={getDoughnutOpts()} />
                    </div>
                    
                    <div style={sc.sumaSimpleBlancaContainer}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Resumen del Segmento Seleccionado
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem' }}>
                        <div style={sc.sumaSimpleItem}>Bautizados: <span style={{ color: '#2563eb', fontWeight: '700', fontSize: '1rem' }}>{totalesFiltradosTabla.bautizados}</span></div>
                        <div style={sc.sumaSimpleItem}>Recíen bautizados: <span style={{ color: '#f97316', fontWeight: '800', fontSize: '0.9rem' }}>{totalesFiltradosTabla.recientes}</span></div>
                        <div style={{ ...sc.sumaSimpleItem, borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
                          Total: <span style={{ color: '#ea580c', fontWeight: '900', fontSize: '1.1rem', display: 'inline-block', animation: 'totalGlow 1.8s infinite'}}>{totalesFiltradosTabla.totalASD}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                  
                  {/* Bloques equilibrados de dos columnas exactas e inmunes a desborde horizontal */}
                  <div style={{ ...sc.escuelasGridBotones, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {escuelasFiltradasLista.map((esc, idx) => (
                      <FichaEscuelaCard 
                        key={`${esc.facultad}-${esc.escuela}`}
                        nombre={esc.escuela}
                        total={esc.totalASD}
                        color={PALETA_COLORES[idx % PALETA_COLORES.length]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 👥 RECUENTO TOTAL DE ALUMNOS PARTICIPANTES GENERALES */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '2.5rem' }}>
              <SectionTitle color="#2563eb">👨‍🎓 Total de estudiantes en clases bíblicas</SectionTitle>
              <div style={{ ...sc.counterBadgeGlobal, background: '#eff6ff', color: '#2563eb', borderColor: '#2563eb33' }}>
                Universo Matriculado General: <strong>{globalDataYGraficos.totalAlumnos}</strong> Alumnos Activos
              </div>
            </div>

            <div style={{ ...sc.card, marginBottom: '2.5rem' }}>
              <div style={{ ...s.reportHeaderRow, marginTop: 0, marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {['TODAS', ...globalDataYGraficos.facOrdenadas.map(([n]) => n)]
                    .filter(facBtn => facBtn !== 'Faculty Computer Science')
                    .map(facBtn => (
                      <button
                        key={facBtn} onClick={() => setFacultadFiltroTotal(facBtn)}
                        style={{
                          padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', borderRadius: '6px',
                          cursor: 'pointer', border: '1px solid', transition: 'all 0.15s ease',
                          background: facultadFiltroTotal === facBtn ? '#2563eb' : '#ffffff',
                          borderColor: facultadFiltroTotal === facBtn ? '#2563eb' : '#e2e8f0',
                          color: facultadFiltroTotal === facBtn ? '#ffffff' : '#64748b',
                          boxShadow: facultadFiltroTotal === facBtn ? '0 2px 6px rgba(37,99,235,0.2)' : 'none'
                        }}
                      >
                        {facBtn}
                      </button>
                    ))}
                </div>
              </div>

              {totalEscuelasLista.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '4rem 0', fontStyle: 'italic' }}>
                  No se registraron alumnos matriculados en este segmento.
                </p>
              ) : (
                <div style={s.layoutGridImagen}>
                  
                  {/* COLUMNA IZQUIERDA: DONA HÍBRIDA DINÁMICA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <DoughnutChartReal data={doughnutTotalParticipantesData} options={getDoughnutOpts()} />
                    </div>
                    
                    <div style={sc.sumaSimpleBlancaContainer}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Métricas del Segmento Activo
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem' }}>
                        <div style={sc.sumaSimpleItem}>
                          Alumnos Totales Registrados: <span style={{ color: '#2563eb', fontWeight: '900', fontSize: '1.1rem', marginLeft: '0.5rem' }}>
                            {totalEscuelasLista.reduce((acc, curr) => acc + curr.totalAlumnos, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Cuadrícula lateral corregida a 2 columnas con expansión vertical limpia */}
                  <div style={{ ...sc.escuelasGridBotones, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {totalEscuelasLista.map((esc, idx) => (
                      <FichaEscuelaCard 
                        key={`total-${esc.facultad}-${esc.escuela}`}
                        nombre={esc.escuela}
                        total={esc.totalAlumnos}
                        color={PALETA_COLORES[idx % PALETA_COLORES.length]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 🏫 REPORTE: VOLUMEN DE CLASES BÍBLICAS ACTIVAS (100% PANTALLA COMPLETA) */}
            <SectionTitle color="#6366f1">🏫+📖 Clases Bíblicas Activas por Escuela y Facultad</SectionTitle>
            
            <div style={{ ...sc.card, marginBottom: '2.5rem' }}>
              <div style={{ ...s.reportHeaderRow, marginTop: 0, marginBottom: '2rem' }}>
              </div>

              {dataClasesPorEstructura.escuelas.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '4rem 0', fontStyle: 'italic' }}>
                  No se registran clases bíblicas configuradas en el sistema.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
                  
                  {/* Gráfico de Barras a pantalla completa con Tooltip Personalizado */}
                  <div style={{ width: '100%', height: 420, padding: '0 0.5rem' }}>
                    <BarChartReal data={dataClasesPorEstructura.barChartData} options={getBarOpts()} />
                  </div>

                  {/* Listado en formato de tablero general adaptativo */}
                  <div style={{ ...sc.escuelasGridBotones, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {dataClasesPorEstructura.escuelas.map((esc, idx) => (
                      <FichaEscuelaCard 
                        key={`clase-esc-${idx}`}
                        nombre={esc.nombre}
                        total={esc.total}
                        color={PALETA_COLORES[idx % PALETA_COLORES.length]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen de Facultades Pintados en Sincronía con la Dona */}
              <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.2rem' }}>
                  Resumen de Clase Bíblica por Facultad
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                  {dataClasesPorEstructura.facultades
                    .filter(f => f.nombre !== 'Faculty Computer Science')
                    .map((fac, idx) => {
                      const colorFacultad = PALETA_COLORES[idx % PALETA_COLORES.length]
                      return (
                        <div 
                          key={`clase-fac-${idx}`}
                          style={{ 
                            background: '#ffffff', 
                            border: `1px solid ${colorFacultad}25`, 
                            borderLeft: `5px solid ${colorFacultad}`,
                            padding: '1.2rem', 
                            borderRadius: '16px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between',
                            gap: '0.3rem',
                            minHeight: '120px',
                            boxShadow: '0 4px 12px rgba(15,23,42,0.015)'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{fac.nombre}</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: '950', color: colorFacultad, lineHeight: 1.2 }}>
                            {fac.total} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>{fac.total === 1 ? 'Clase' : 'Clases'}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* 🔄 SECCIÓN INFERIOR: MATRIZ OPERATIVA CON FILTRADO PRECISADO DE DOCENTES */}
            <div style={s.reportHeaderRow}>
              <div style={sc.secTitleContainer}>
                <div style={{ ...sc.secTitleIndicator, background: '#0ea5e9' }} />
                <h2 style={sc.secTitleText}>📖 Clases Bíblicas</h2>
              </div>
              
              <div style={s.filterBtnGroup}>
                {['todos', 'con_sesion', 'sin_sesion', 'inactivo'].map(tipo => (
                  <button 
                    key={tipo} style={getFiltroBtnStyle(tipo)} onClick={() => setFiltroSesiones(tipo)}
                    onMouseEnter={() => setHoveredBtn(tipo)} onMouseLeave={() => setHoveredBtn(null)}
                  >
                    {tipo === 'todos' && `Mostrar todos (${totalTodos})`}
                    {tipo === 'con_sesion' && `Con Sesión (${totalConSesion})`}
                    {tipo === 'sin_sesion' && `Sin Sesión (${totalSinSesion})`}
                    {tipo === 'inactivo' && `Inactivos (${totalInactivos})`}
                  </button>
                ))}
              </div>
            </div>

            {maestrosFiltrados.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '2.5rem 0.5rem', fontStyle: 'italic', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                No hay registros que coincidan con este filtro en el segmento actual.
              </p>
            ) : (
              <div style={s.reportGrid}>
                {maestrosFiltrados.map((item, index) => (
                  <ReporteMaestroCard key={item.id} item={item} index={index} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerMain}>© {new Date().getFullYear()} Clases Bíblicas · Universidad Peruana Unión — Juliaca</div>
        <div style={s.footerPowered}>Powered by <strong style={{ color: '#64748b' }}>Asuntos Académicos 2026</strong></div>
      </footer>

      {modalAbierto && <LoginModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}

/* ==========================================================================
   OBJETOS DE ESTILOS CSS-IN-JS
   ========================================================================== */
const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' },
  navbar: { background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(29,78,216,0.15)' },
  navInner: { maxWidth: 1280, margin: '0 auto', padding: '0 1.75rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navBrand: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  navLogoWrap: { width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  navTitle: { fontWeight: 800, fontSize: '0.98rem', color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2 },
  navSub:   { fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: '0.05rem' },
  btnNav:   { padding: '0.45rem 1.25rem', fontSize: '0.85rem' },
  hero: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)', padding: '3.5rem 1.75rem', position: 'relative', overflow: 'hidden' },
  heroInner: { maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' },
  heroLeft: { flex: 1, minWidth: 280 },
  heroTag: { display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 99, padding: '0.28rem 0.85rem', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' },
  heroTitle: { fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 900, color: 'white', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '0.75rem' },
  heroDesc: { fontSize: '0.93rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, maxWidth: 480 },
  heroStats: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '1.25rem 1.5rem', backdropFilter: 'blur(10px)', flexShrink: 0 },
  heroStat: { textAlign: 'center', padding: '0 0.75rem' },
  heroStatVal: { fontSize: '2rem', fontWeight: 900, lineHeight: 1 },
  heroStatLabel: { fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  main: { flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '2.5rem 1.75rem' },
  loading: { display: 'flex', flexDirection: 'column', padding: '5rem 0', alignItems: 'center' },
  loadingSpinner: { width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', animation: 'spin 0.8s linear infinite' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem', alignItems: 'start' },
  layoutGridImagen: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2.5rem', width: '100%' },
  footer: { textAlign: 'center', padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  footerMain: { fontSize: '0.8rem', color: '#94a3b8' },
  footerPowered: { fontSize: '0.74rem', color: '#cbd5e1' },
  reportHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', width: '100%', marginTop: '2rem', marginBottom: '1.2rem' },
  filterBtnGroup: { display: 'flex', gap: '0.35rem' },
  reportGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.6rem', marginBottom: '2.5rem', marginTop: '0.5rem' },
  reportCard: { borderRadius: '10px', padding: '0.75rem', border: '1px solid #e2e8f0', position: 'relative', display: 'flex', alignItems: 'flex-start', minHeight: '48px', cursor: 'pointer', minWidth: 0 },
  cardNumber: { marginRight: '0.2rem', flexShrink: 0 },
  cardClaseTitle: { fontSize: '0.81rem', fontWeight: 700, margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', minWidth: 0 },
  tooltipBubble: { position: 'absolute', bottom: '125%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#f1f5f9', padding: '0.65rem 0.8rem', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3)', width: '190px', zIndex: 999, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem', animation: 'fadeIn 0.15s ease-out' },
  tooltipArrow: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: '#1e293b' },
  cardTeacherLabel: { display: 'block', fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardDocenteTooltip: { fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 },
}

const sc = {
  metric: { borderRadius: 16, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 18px rgba(15,23,42,0.03)' },
  metricIconContainer: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 },
  metricContent: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  metricValue: { fontSize: '1.85rem', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '0.2rem' },
  metricLabel: { fontSize: '0.78rem', color: '#64748b', fontWeight: 600, letterSpacing: '-0.01em' },
  metricIndicatorBar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  secTitleContainer: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '2.2rem', marginBottom: '1.2rem' },
  secTitleIndicator: { width: 5, height: 20, borderRadius: 3 },
  secTitleText: { fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 },
  card: { background: 'white', borderRadius: 20, padding: '1.5rem', boxShadow: '0 10px 25px -5px rgba(15,23,42,0.02), 0 8px 10px -6px rgba(15,23,42,0.02)', border: '1px solid #f1f5f9' },
  cardHead: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' },
  cardAccent: { width: 3.5, height: 32, borderRadius: 4, flexShrink: 0, marginTop: '0.1rem' },
  cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 },
  cardSubtitle: { fontSize: '0.76rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 },
  cardBadgeTooltip: { alignSelf: 'flex-start', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', color: 'white', marginTop: '0.1rem' },
  counterBadgeGlobal: { padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#fff3eb', border: '1px solid #f9731633', color: '#ea580c', borderRadius: '10px', fontWeight: '600' },
  
  /* Contenedores de grillas estabilizados */
  escuelasGridBotones: { display: 'grid', gap: '0.75rem', alignContent: 'start', width: '100%' },
  btnEscuelaFicha: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.01)', minHeight: '44px' },
  
  sumaSimpleBlancaContainer: { background: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '0.5rem', width: '100%' },
  sumaSimpleItem: { display: 'inline-flex', fontSize: '0.82rem', fontWeight: '600', color: '#475569' },
  
  /* ESTILOS DE LA DISTRIBUCIÓN EDUCATIVA AGRUPADA */
  escuelasRecientesGridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', width: '100%' },
  escuelaRecienteCardBox: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', background: '#fdfbfe', border: '1px solid #f3e8ff', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.15s ease' },
  escuelaRecienteLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 },
  escienteIconCircle: { fontSize: '1.2rem', flexShrink: 0 },
  escuelaRecienteName: { fontSize: '0.8rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' },
  escuelaRecienteCounter: { fontSize: '0.88rem', fontWeight: '900', padding: '0.25rem 0.65rem', borderRadius: '8px' },
  escuelaRecienteTooltipBubble: { position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', boxShadow: '0 12px 30px -4px rgba(0,0,0,0.25)', width: '250px', zIndex: 999, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.12s ease-out' },
  tooltipBubbleHeader: { fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155', paddingBottom: '0.3rem' },
  tooltipClaseRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' },
  tooltipClaseName: { fontSize: '0.75rem', fontWeight: '600', color: '#e2e8f0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 },
  tooltipClaseBadge: { fontSize: '0.68rem', fontWeight: '900', color: '#ffffff', padding: '0.05rem 0.4rem', borderRadius: '4px' },
  tooltipArrowBottom: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: '#0f172a' }
}
