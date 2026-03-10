import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import useIsMobile from '../hooks/useIsMobile'
import GestionUsuarios from '../components/GestionUsuarios'
import ClasesBiblicas from '../components/ClasesBiblicas'
import DataAlumnos from '../components/DataAlumnos'
import Facultad from '../components/Facultad'
import DocentesClases from '../components/DocentesClases'
import LeccionesClases from '../components/LeccionesClases'
import MisClases from '../components/MisClases'
import Estadisticas from '../components/Estadisticas'

const MODULOS_ADMIN = [
  {
    id: 'alumnos',
    titulo: 'Data de Alumnos',
    navLabel: 'Alumnos',
    desc: 'Consulta el registro, asistencia y progreso de todos los alumnos inscritos.',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    icon: <IconAlumnos />,
    navIcon: <NI d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
    tag: 'Registro',
    color: '#7c3aed',
  },
  {
    id: 'clases',
    titulo: 'Clases Bíblicas',
    navLabel: 'Clases',
    desc: 'Organiza y administra el contenido de las clases bíblicas por temas y libros.',
    gradient: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
    icon: <IconClases />,
    navIcon: <NI d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />,
    tag: 'Contenido',
    color: '#16a34a',
  },
  {
    id: 'docentes',
    titulo: 'Docentes con Clases',
    navLabel: 'Docentes',
    desc: 'Consulta qué clases bíblicas tiene asignadas cada docente del sistema.',
    gradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
    icon: <IconDocentes />,
    navIcon: <NI d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm4 4l2 2 4-4" />,
    tag: 'Docentes',
    color: '#0d9488',
  },
  {
    id: 'estadisticas',
    titulo: 'Estadísticas',
    navLabel: 'Estadísticas',
    desc: 'Visualiza la participación por facultad, escuela y el estado espiritual de los alumnos.',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    icon: <IconEstadisticas />,
    navIcon: <NI d="M18 20V10M12 20V4M6 20v-6" />,
    tag: 'Reportes',
    color: '#0284c7',
  },
  {
    id: 'facultad',
    titulo: 'Facultad',
    navLabel: 'Facultad',
    desc: 'Administra las facultades y escuelas profesionales de la universidad.',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    icon: <IconFacultad />,
    navIcon: <NI d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
    tag: 'Académico',
    color: '#d97706',
  },
  {
    id: 'lecciones',
    titulo: 'Lecciones Bíblicas',
    navLabel: 'Lecciones',
    desc: 'Gestiona las lecciones de cada clase bíblica: títulos, fechas y descripciones.',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
    icon: <IconLecciones />,
    navIcon: <NI d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />,
    tag: 'Lecciones',
    color: '#db2777',
  },
  {
    id: 'lidergrupo',
    titulo: 'Líder de Grupo',
    navLabel: 'Líder de Grupo',
    desc: 'Visualiza y gestiona las clases bíblicas de las que eres responsable como líder.',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
    icon: <IconLiderGrupo />,
    navIcon: <NI d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
    tag: 'Mi rol',
    color: '#059669',
  },
  {
    id: 'usuarios',
    titulo: 'Administrar Usuarios',
    navLabel: 'Usuarios',
    desc: 'Crea, gestiona y elimina cuentas de docentes y administradores del sistema.',
    gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
    icon: <IconUsuarios />,
    navIcon: <NI d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
    tag: 'Gestión',
    color: '#2563eb',
  },
]

/* ── Nav Icon helper ── */
function NI({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}

/* ── Dashboard ── */
export default function Dashboard({ sesion }) {
  const esAdmin  = sesion.rol === 'admin'
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  function vistaDesdeURL() {
    const seg = location.pathname.replace(/^\/+/, '')
    if (!seg) return esAdmin ? 'home' : 'misclases'
    return seg
  }
  const [vista, setVista] = useState(vistaDesdeURL)

  function irA(modulo) {
    setVista(modulo)
    setSidebarOpen(false)
    navigate(modulo === 'home' ? '/' : `/${modulo}`, { replace: false })
  }

  useEffect(() => {
    const seg = location.pathname.replace(/^\/+/, '')
    const modulo = seg || (esAdmin ? 'home' : 'misclases')
    setVista(modulo)
  }, [location.pathname])

  function renderVista() {
    if (vista === 'misclases')    return <MisClases docenteId={sesion.uid} />
    if (!esAdmin) return null
    if (vista === 'usuarios')     return <GestionUsuarios uidAdmin={sesion.uid} />
    if (vista === 'clases')       return <ClasesBiblicas />
    if (vista === 'alumnos')      return <DataAlumnos />
    if (vista === 'facultad')     return <Facultad />
    if (vista === 'docentes')     return <DocentesClases />
    if (vista === 'lecciones')    return <LeccionesClases />
    if (vista === 'estadisticas') return <Estadisticas />
    if (vista === 'lidergrupo')   return <MisClases docenteId={sesion.uid} />
    return null
  }

  const modActual = MODULOS_ADMIN.find(m => m.id === vista)
  const initials  = (sesion.nombreCompleto || sesion.username || '?').charAt(0).toUpperCase()

  return (
    <div style={s.app}>

      {/* ── Overlay sidebar mobile ── */}
      {isMobile && sidebarOpen && (
        <div style={s.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar (solo admin) ── */}
      {esAdmin && (
        <aside style={{
          ...s.sidebar,
          background: darkMode ? '#1e293b' : '#ffffff',
          borderRight: darkMode ? '1px solid #334155' : '1px solid var(--border)',
          transform: isMobile
            ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)')
            : 'translateX(0)',
        }}>
          {/* Brand */}
          <div style={{ ...s.brand, borderBottom: darkMode ? '1px solid #334155' : '1px solid var(--border)' }}>
            <div style={s.brandLogo}><BibleSvg /></div>
            <div>
              <div style={s.brandTitle}>Clases Bíblicas</div>
              <div style={s.brandSub}>UPEU · Admin</div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={s.nav}>
            <div style={s.navSection}>MÓDULOS</div>
            {MODULOS_ADMIN.map(mod => {
              const activo = vista === mod.id
              return (
                <button
                  key={mod.id}
                  style={{
                    ...s.navItem,
                    ...(activo ? {
                      background: darkMode ? 'rgba(37,99,235,0.18)' : '#eff6ff',
                      color: darkMode ? '#93c5fd' : '#1d4ed8',
                      fontWeight: 600,
                    } : {}),
                  }}
                  onClick={() => irA(mod.id)}
                >
                  <span style={{ ...s.navIconWrap, color: activo ? mod.color : undefined }}>
                    {mod.navIcon}
                  </span>
                  <span style={s.navLabel}>{mod.navLabel}</span>
                  {activo && <span style={{ ...s.navDot, background: mod.color }} />}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div style={{ ...s.sidebarFooter, borderTop: darkMode ? '1px solid #334155' : '1px solid var(--border)' }}>
            <div style={s.userCard}>
              <div style={s.userAvatar}>{initials}</div>
              <div style={s.userInfo}>
                <div style={s.userName}>{sesion.nombreCompleto || sesion.username}</div>
                <div style={s.userRole}>Administrador</div>
              </div>
            </div>
            <button style={s.signOutBtn} onClick={() => signOut(auth)}>
              <LogoutSvg /> Cerrar sesión
            </button>
          </div>
        </aside>
      )}

      {/* ── Área principal ── */}
      <div style={{
        ...s.mainWrapper,
        marginLeft: esAdmin && !isMobile ? 'var(--sidebar-w)' : 0,
      }}>

        {/* ── Top bar ── */}
        <header style={{
          ...s.topbar,
          background: darkMode ? 'rgba(30,41,59,0.97)' : 'rgba(255,255,255,0.88)',
          borderBottom: darkMode ? '1px solid #334155' : '1px solid var(--border)',
        }}>
          <div style={s.topbarLeft}>
            {esAdmin && isMobile && (
              <button style={s.hamburger} onClick={() => setSidebarOpen(v => !v)}>
                <HamburgerSvg />
              </button>
            )}
            {!esAdmin && (
              <div style={s.brandInline}>
                <BibleSvg small />
                <span style={s.brandInlineTitle}>Clases Bíblicas</span>
              </div>
            )}
            {esAdmin && (
              <div style={s.breadcrumbTop}>
                {vista !== 'home' && (
                  <>
                    <span style={s.breadLink} onClick={() => irA('home')}>Inicio</span>
                    <span style={s.breadSep}>›</span>
                  </>
                )}
                <span style={s.breadCurrent}>
                  {vista === 'home' ? 'Panel de administración' : (modActual?.titulo ?? vista)}
                </span>
              </div>
            )}
          </div>

          <div style={s.topbarRight}>
            {!esAdmin && (
              <div style={s.userChip}>
                <div style={s.userChipAvatar}>{initials}</div>
                <span style={s.userChipName}>{sesion.username}</span>
                <span style={s.rolPill}>Docente</span>
              </div>
            )}
            <button
              style={s.darkBtn}
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <SunSvg /> : <MoonSvg />}
            </button>
            <button
              style={s.signOutTopBtn}
              onClick={() => signOut(auth)}
            >
              <LogoutSvg />
              {!isMobile && <span>Salir</span>}
            </button>
          </div>
        </header>

        {/* ── Contenido ── */}
        <main style={s.content}>

          {/* HOME ADMIN */}
          {esAdmin && vista === 'home' && (
            <div style={{ animation: 'scaleIn 0.22s ease' }}>
              <div style={s.welcomeRow}>
                <div>
                  <h1 style={s.welcomeTitle}>Bienvenido, {sesion.nombreCompleto || sesion.username} 👋</h1>
                  <p style={s.welcomeDesc}>Selecciona un módulo para comenzar a administrar.</p>
                </div>
              </div>
              <div style={s.modulosGrid}>
                {MODULOS_ADMIN.map(mod => (
                  <ModuloCard key={mod.id} mod={mod} onClick={() => irA(mod.id)} />
                ))}
              </div>
            </div>
          )}

          {/* VISTA MÓDULO */}
          {(!esAdmin || vista !== 'home') && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              {renderVista()}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

/* ── Tarjeta módulo ── */
function ModuloCard({ mod, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      style={{
        ...s.modCard,
        transform: hov ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 20px 48px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.08)'
          : '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ ...s.modHeader, background: mod.gradient }}>
        <span style={s.modTag}>{mod.tag}</span>
        <div style={s.modIconWrap}>{mod.icon}</div>
      </div>
      <div style={s.modBody}>
        <div style={s.modTitle}>{mod.titulo}</div>
        <div style={s.modDesc}>{mod.desc}</div>
        <div style={{ ...s.modCta, background: hov ? mod.color : 'transparent', color: hov ? 'white' : mod.color, borderColor: mod.color }}>
          Abrir módulo →
        </div>
      </div>
    </div>
  )
}

/* ── SVG helpers ── */
function BibleSvg({ small }) {
  const sz = small ? 20 : 28
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
function LogoutSvg() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function MoonSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function SunSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}
function HamburgerSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

/* ── Card icons (large, for module cards) ── */
function IconUsuarios() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <circle cx="28" cy="26" r="12" fill="rgba(255,255,255,0.9)" />
      <path d="M4 60c0-13.3 10.7-24 24-24s24 10.7 24 24" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <circle cx="52" cy="24" r="9" fill="rgba(255,255,255,0.5)" />
      <path d="M44 56c0-8.8 5.4-16.4 13-19.7" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  )
}
function IconClases() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <rect x="10" y="12" width="40" height="52" rx="4" fill="rgba(255,255,255,0.9)" />
      <rect x="18" y="24" width="24" height="3" rx="1.5" fill="#16a34a" />
      <rect x="18" y="32" width="20" height="3" rx="1.5" fill="#16a34a" />
      <rect x="18" y="40" width="22" height="3" rx="1.5" fill="#16a34a" />
      <rect x="18" y="48" width="16" height="3" rx="1.5" fill="#16a34a" />
    </svg>
  )
}
function IconAlumnos() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="16" width="56" height="42" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
      <rect x="16" y="26" width="16" height="16" rx="8" fill="rgba(255,255,255,0.9)" />
      <rect x="36" y="28" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.9)" />
      <rect x="36" y="35" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.6)" />
    </svg>
  )
}
function IconFacultad() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="28" width="56" height="36" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
      <polygon points="36,8 6,28 66,28" fill="rgba(255,255,255,0.9)"/>
      <rect x="22" y="40" width="10" height="24" rx="2" fill="rgba(255,255,255,0.85)"/>
      <rect x="40" y="40" width="10" height="24" rx="2" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
}
function IconDocentes() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <circle cx="24" cy="22" r="11" fill="rgba(255,255,255,0.9)" />
      <path d="M4 54c0-11 9-20 20-20s20 9 20 20" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <rect x="46" y="28" width="20" height="4" rx="2" fill="rgba(255,255,255,0.85)"/>
      <rect x="46" y="38" width="16" height="4" rx="2" fill="rgba(255,255,255,0.65)"/>
      <rect x="46" y="48" width="18" height="4" rx="2" fill="rgba(255,255,255,0.5)"/>
    </svg>
  )
}
function IconLecciones() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <rect x="10" y="8" width="38" height="50" rx="4" fill="rgba(255,255,255,0.9)"/>
      <rect x="18" y="20" width="22" height="3" rx="1.5" fill="#a855f7"/>
      <rect x="18" y="28" width="18" height="3" rx="1.5" fill="#a855f7" opacity=".7"/>
      <rect x="18" y="36" width="20" height="3" rx="1.5" fill="#a855f7" opacity=".5"/>
      <rect x="18" y="44" width="14" height="3" rx="1.5" fill="#a855f7" opacity=".35"/>
      <circle cx="54" cy="52" r="13" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
      <line x1="54" y1="46" x2="54" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="54" y1="52" x2="58" y2="56" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
function IconEstadisticas() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="44" width="12" height="20" rx="3" fill="rgba(255,255,255,0.9)"/>
      <rect x="26" y="30" width="12" height="34" rx="3" fill="rgba(255,255,255,0.9)"/>
      <rect x="44" y="16" width="12" height="48" rx="3" fill="rgba(255,255,255,0.9)"/>
      <polyline points="14,38 32,24 50,10" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <circle cx="14" cy="38" r="4" fill="rgba(255,255,255,0.8)"/>
      <circle cx="32" cy="24" r="4" fill="rgba(255,255,255,0.8)"/>
      <circle cx="50" cy="10" r="4" fill="rgba(255,255,255,0.8)"/>
    </svg>
  )
}
function IconLiderGrupo() {
  return (
    <svg width="60" height="60" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="20" r="13" fill="rgba(255,255,255,0.9)"/>
      <path d="M10 58c0-14.4 11.6-26 26-26s26 11.6 26 26" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <polygon points="52,10 54,16 60,16 55,20 57,26 52,22 47,26 49,20 44,16 50,16" fill="rgba(255,255,255,0.75)"/>
    </svg>
  )
}

/* ── Estilos ── */
const s = {
  /* Layout */
  app: { display: 'flex', minHeight: '100vh', background: 'var(--bg)' },

  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(2px)',
    zIndex: 199,
    animation: 'fadeIn 0.18s ease',
  },

  /* Sidebar */
  sidebar: {
    position: 'fixed', left: 0, top: 0, bottom: 0,
    width: 'var(--sidebar-w)',
    background: '#ffffff',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    zIndex: 200,
    transition: 'transform 0.26s cubic-bezier(0.4,0,0.2,1)',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
  },

  brand: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1.25rem 1.1rem 1rem',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  brandLogo: {
    width: 36, height: 36, borderRadius: 9,
    background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
  },
  brandTitle: { fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', letterSpacing: '-0.02em' },
  brandSub:   { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.05rem', fontWeight: 500 },

  nav:        { flex: 1, padding: '0.75rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  navSection: {
    fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-faint)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '0.5rem 0.65rem 0.4rem',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.7rem',
    padding: '0.58rem 0.75rem',
    borderRadius: 9, border: 'none',
    background: 'transparent', color: 'var(--text-muted)',
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.865rem', fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
    textAlign: 'left', width: '100%',
    position: 'relative',
  },
  navItemActivo: {
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  navIconWrap: { flexShrink: 0, opacity: 0.85 },
  navLabel:    { flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  navDot: {
    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
  },

  sidebarFooter: {
    padding: '0.75rem 0.8rem 1rem',
    borderTop: '1px solid var(--border)', flexShrink: 0,
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '0.65rem',
    padding: '0.6rem 0.5rem', marginBottom: '0.5rem',
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    color: 'white', fontWeight: 700, fontSize: '0.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  userInfo:   { minWidth: 0 },
  userName:   { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole:   { fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 },
  signOutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
    width: '100%', padding: '0.48rem', borderRadius: 8,
    background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 600,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  },

  /* Main wrapper */
  mainWrapper: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, transition: 'margin-left 0.26s cubic-bezier(0.4,0,0.2,1)' },

  /* Top bar */
  topbar: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderBottom: '1px solid var(--border)',
    height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.4rem',
    gap: '1rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 },
  topbarRight:{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 },

  hamburger: {
    width: 36, height: 36, borderRadius: 8,
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  brandInline: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand)' },
  brandInlineTitle: { fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' },

  breadcrumbTop: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', minWidth: 0 },
  breadLink: {
    color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500,
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  breadSep:     { color: 'var(--text-faint)', flexShrink: 0 },
  breadCurrent: {
    color: 'var(--text)', fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    letterSpacing: '-0.01em',
  },

  userChip: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    padding: '0.25rem 0.75rem 0.25rem 0.3rem',
  },
  userChipAvatar: {
    width: 24, height: 24, borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
    color: 'white', fontWeight: 700, fontSize: '0.68rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  userChipName: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' },
  rolPill: {
    background: '#dbeafe', color: '#1d4ed8',
    borderRadius: 99, fontSize: '0.66rem', fontWeight: 700,
    padding: '0.1rem 0.5rem', whiteSpace: 'nowrap',
  },

  darkBtn: {
    width: 34, height: 34, borderRadius: 8,
    background: 'transparent', border: '1.5px solid var(--border)',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.15s, color 0.15s',
  },

  signOutTopBtn: {
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.75rem',
    background: 'transparent', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text-muted)',
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 600,
    transition: 'background 0.15s, color 0.15s',
  },

  /* Content */
  content: {
    flex: 1,
    padding: '1.4rem',
    maxWidth: 1280,
    width: '100%',
    margin: '0 auto',
  },

  /* Welcome */
  welcomeRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem',
  },
  welcomeTitle: {
    fontSize: '1.65rem', fontWeight: 800,
    color: 'var(--text)', letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  welcomeDesc: { fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '0.4rem' },

  /* Module grid */
  modulosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },

  /* Module card */
  modCard: {
    background: 'var(--surface)',
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    border: '1px solid var(--border)',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  },
  modHeader: {
    height: 150,
    position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modIconWrap: {
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.2))',
  },
  modTag: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.35)',
    color: 'white', borderRadius: 99,
    fontSize: '0.68rem', fontWeight: 700,
    padding: '0.18rem 0.65rem',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    backdropFilter: 'blur(4px)',
  },
  modBody:  { padding: '1.1rem 1.25rem 1.25rem' },
  modTitle: { fontSize: '0.97rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem', letterSpacing: '-0.01em' },
  modDesc:  { fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' },
  modCta: {
    display: 'inline-flex', alignItems: 'center',
    padding: '0.4rem 1rem', borderRadius: 8,
    fontSize: '0.82rem', fontWeight: 700,
    border: '1.5px solid',
    transition: 'background 0.2s, color 0.2s',
  },
}
