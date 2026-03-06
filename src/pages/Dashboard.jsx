import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import GestionUsuarios from '../components/GestionUsuarios'
import ClasesBiblicas from '../components/ClasesBiblicas'
import DataAlumnos from '../components/DataAlumnos'
import Facultad from '../components/Facultad'
import DocentesClases from '../components/DocentesClases'
import LeccionesClases from '../components/LeccionesClases'
import MisClases from '../components/MisClases'

const MODULOS_ADMIN = [
  {
    id: 'usuarios',
    titulo: 'Administrar Usuarios',
    desc: 'Crea, gestiona y elimina cuentas de docentes y administradores del sistema.',
    gradient: 'linear-gradient(180deg, rgba(2,48,82,0.45) 0%, rgba(2,48,82,0.82) 100%)',
    imagen: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80',
    icon: <IconUsuarios />,
    tag: 'Gestión',
  },
  {
    id: 'clases',
    titulo: 'Clases Bíblicas',
    desc: 'Organiza y administra el contenido de las clases bíblicas por temas y libros.',
    gradient: 'linear-gradient(180deg, rgba(6,95,70,0.40) 0%, rgba(6,95,70,0.80) 100%)',
    imagen: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=700&q=80',
    icon: <IconClases />,
    tag: 'Contenido',
  },
  {
    id: 'alumnos',
    titulo: 'Data de Alumnos',
    desc: 'Consulta el registro, asistencia y progreso de todos los alumnos inscritos.',
    gradient: 'linear-gradient(180deg, rgba(109,40,217,0.40) 0%, rgba(109,40,217,0.80) 100%)',
    imagen: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80',
    icon: <IconAlumnos />,
    tag: 'Registro',
  },
  {
    id: 'facultad',
    titulo: 'Facultad',
    desc: 'Administra las facultades y escuelas profesionales de la universidad.',
    gradient: 'linear-gradient(180deg, rgba(180,83,9,0.40) 0%, rgba(217,119,6,0.82) 100%)',
    imagen: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?auto=format&fit=crop&w=700&q=80',
    icon: <IconFacultad />,
    tag: 'Académico',
  },
  {
    id: 'docentes',
    titulo: 'Docentes con Clases Bíblicas',
    desc: 'Consulta qué clases bíblicas tiene asignadas cada docente del sistema.',
    gradient: 'linear-gradient(180deg, rgba(15,118,110,0.40) 0%, rgba(15,118,110,0.82) 100%)',
    imagen: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=700&q=80',
    icon: <IconDocentes />,
    tag: 'Docentes',
  },
  {
    id: 'lecciones',
    titulo: 'Lecciones de Clases Bíblicas',
    desc: 'Gestiona las lecciones de cada clase bíblica: títulos, fechas y descripciones.',
    gradient: 'linear-gradient(180deg, rgba(124,58,237,0.40) 0%, rgba(124,58,237,0.82) 100%)',
    imagen: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=700&q=80',
    icon: <IconLecciones />,
    tag: 'Lecciones',
  },
]

export default function Dashboard({ sesion }) {
  const esAdmin = sesion.rol === 'admin'
  const [vista, setVista] = useState(esAdmin ? 'home' : 'misclases')

  function renderVista() {
    if (vista === 'misclases') return <MisClases docenteId={sesion.uid} />
    if (!esAdmin) return null
    if (vista === 'usuarios')  return <GestionUsuarios uidAdmin={sesion.uid} />
    if (vista === 'clases')    return <ClasesBiblicas />
    if (vista === 'alumnos')   return <DataAlumnos />
    if (vista === 'facultad')  return <Facultad />
    if (vista === 'docentes')  return <DocentesClases />
    if (vista === 'lecciones') return <LeccionesClases />
    return null
  }

  return (
    <div style={s.page}>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {esAdmin && vista !== 'home' && (
            <button style={s.backBtn} onClick={() => setVista('home')} title="Volver">
              ←
            </button>
          )}
          <div>
            <div style={s.headerTitle}>Clases Bíblicas</div>
            <div style={s.headerSub}>
              {sesion.username}
              <span style={s.rolBadge}>{esAdmin ? 'Administrador' : 'Docente'}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {!esAdmin && (
            <TabBtn label="Mis clases" activa={vista === 'misclases'} onClick={() => setVista('misclases')} />
          )}
          <button className="btn btn-ghost" onClick={() => signOut(auth)}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* ── Contenido ── */}
      <main style={s.main}>

        {/* HOME ADMIN */}
        {esAdmin && vista === 'home' && (
          <>
            <div style={s.welcomeBox}>
              <h2 style={s.welcomeTitle}>Bienvenido, {sesion.username}</h2>
              <p style={s.welcomeDesc}>¿Qué deseas administrar hoy?</p>
            </div>

            <div style={s.modulosGrid}>
              {MODULOS_ADMIN.map(mod => (
                <ModuloCard key={mod.id} mod={mod} onClick={() => setVista(mod.id)} />
              ))}
            </div>
          </>
        )}

        {/* VISTA DE MÓDULO */}
        {(!esAdmin || vista !== 'home') && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {esAdmin && vista !== 'home' && (
              <div style={s.breadcrumb}>
                <span style={s.breadcrumbLink} onClick={() => setVista('home')}>Inicio</span>
                <span style={s.breadcrumbSep}>›</span>
                <span>{MODULOS_ADMIN.find(m => m.id === vista)?.titulo ?? vista}</span>
              </div>
            )}
            {renderVista()}
          </div>
        )}

      </main>
    </div>
  )
}

/* ── Tarjeta de módulo ── */
function ModuloCard({ mod, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        ...s.moduloCard,
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? '0 20px 48px rgba(2,48,82,0.20)'
          : '0 4px 16px rgba(2,48,82,0.10)',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Imagen / ilustración */}
      <div style={{
        ...s.moduloImg,
        backgroundImage: `url(${mod.imagen})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div style={{ ...s.moduloImgOverlay, background: mod.gradient }} />
        <div style={s.moduloIconWrap}>{mod.icon}</div>
        <span style={s.moduloTag}>{mod.tag}</span>
      </div>

      {/* Texto */}
      <div style={s.moduloBody}>
        <h3 style={s.moduloTitulo}>{mod.titulo}</h3>
        <p style={s.moduloDesc}>{mod.desc}</p>
        <div style={{
          ...s.moduloBtn,
          background:  hovered ? '#023052' : '#EAEAEA',
          color:       hovered ? 'white'   : '#023052',
          boxShadow:   hovered ? '0 6px 18px rgba(2,48,82,0.35)' : '0 1px 3px rgba(2,48,82,0.10)',
          transform:   hovered ? 'translateY(-2px)' : 'translateY(0)',
        }}>
          Abrir módulo →
        </div>
      </div>
    </div>
  )
}

/* ── Placeholder ── */
function ProximamentePage({ titulo }) {
  return (
    <div style={px.wrap}>
      <div style={px.icon}>🚧</div>
      <h3 style={px.titulo}>{titulo}</h3>
      <p style={px.desc}>Este módulo está en desarrollo. Pronto estará disponible.</p>
    </div>
  )
}

/* ── Tab button ── */
function TabBtn({ label, activa, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...s.tabBtn,
        background:  activa ? 'rgba(255,255,255,0.22)' : 'transparent',
        borderColor: activa ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.25)',
      }}
    >
      {label}
    </button>
  )
}

/* ── SVG Icons ── */
function IconUsuarios() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <circle cx="28" cy="26" r="12" fill="rgba(255,255,255,0.9)" />
      <path d="M4 60c0-13.3 10.7-24 24-24s24 10.7 24 24" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <circle cx="52" cy="24" r="9" fill="rgba(255,255,255,0.5)" />
      <path d="M44 56c0-8.8 5.4-16.4 13-19.7" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

function IconClases() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="10" y="12" width="40" height="52" rx="4" fill="rgba(255,255,255,0.9)" />
      <rect x="18" y="24" width="24" height="3" rx="1.5" fill="#065f46" />
      <rect x="18" y="32" width="20" height="3" rx="1.5" fill="#065f46" />
      <rect x="18" y="40" width="22" height="3" rx="1.5" fill="#065f46" />
      <rect x="18" y="48" width="16" height="3" rx="1.5" fill="#065f46" />
      <circle cx="54" cy="54" r="12" fill="rgba(255,255,255,0.3)" />
      <path d="M49 54l4 4 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconAlumnos() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="16" width="56" height="42" rx="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
      <rect x="16" y="26" width="16" height="16" rx="8" fill="rgba(255,255,255,0.9)" />
      <rect x="36" y="28" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.9)" />
      <rect x="36" y="35" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.6)" />
      <rect x="16" y="48" width="40" height="2" rx="1" fill="rgba(255,255,255,0.3)" />
    </svg>
  )
}

function IconFacultad() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="28" width="56" height="36" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
      <polygon points="36,8 6,28 66,28" fill="rgba(255,255,255,0.9)"/>
      <rect x="22" y="40" width="10" height="24" rx="2" fill="rgba(255,255,255,0.85)"/>
      <rect x="40" y="40" width="10" height="24" rx="2" fill="rgba(255,255,255,0.85)"/>
      <rect x="28" y="32" width="16" height="8" rx="2" fill="rgba(255,255,255,0.5)"/>
    </svg>
  )
}

function IconDocentes() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
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
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="10" y="8" width="38" height="50" rx="4" fill="rgba(255,255,255,0.9)"/>
      <rect x="18" y="20" width="22" height="3" rx="1.5" fill="#7c3aed"/>
      <rect x="18" y="28" width="18" height="3" rx="1.5" fill="#7c3aed" opacity=".7"/>
      <rect x="18" y="36" width="20" height="3" rx="1.5" fill="#7c3aed" opacity=".5"/>
      <rect x="18" y="44" width="14" height="3" rx="1.5" fill="#7c3aed" opacity=".35"/>
      <circle cx="54" cy="52" r="13" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
      <line x1="54" y1="46" x2="54" y2="52" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="54" y1="52" x2="58" y2="56" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Estilos ── */
const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#EAEAEA' },

  // Header
  header: {
    background: 'linear-gradient(90deg, #011e35 0%, #023052 60%, #04508a 100%)',
    color: 'white',
    padding: '0 2rem',
    height: 68,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 2px 16px rgba(2,48,82,0.30)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  headerTitle: { fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' },
  headerSub:   { fontSize: '0.82rem', opacity: 0.8, marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  rolBadge: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.30)',
    borderRadius: 99, padding: '0.1rem 0.6rem',
    fontSize: '0.72rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 8,
    width: 34, height: 34, fontSize: '1rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', transition: 'background 0.2s',
  },
  tabBtn: {
    padding: '0.4rem 1rem',
    border: '1.5px solid',
    borderRadius: 8,
    fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    color: 'white',
    transition: 'background 0.18s, border-color 0.18s',
  },

  // Main
  main: { flex: 1, padding: '2rem', maxWidth: 1200, width: '100%', margin: '0 auto' },

  // Welcome
  welcomeBox: { marginBottom: '2rem' },
  welcomeTitle: { fontSize: '1.6rem', fontWeight: 800, color: '#023052', letterSpacing: '-0.02em' },
  welcomeDesc:  { fontSize: '0.95rem', color: '#5a7a94', marginTop: '0.3rem' },

  // Grid módulos
  modulosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.6rem',
  },

  // Módulo card
  moduloCard: {
    background: 'white',
    borderRadius: 18,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    border: '1px solid #e0e0e0',
  },
  moduloImg: {
    height: 180,
    position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  moduloImgOverlay: {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.08)',
  },
  moduloIconWrap: {
    position: 'relative', zIndex: 1,
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
  },
  moduloTag: {
    position: 'absolute', top: 14, right: 14,
    background: 'rgba(255,255,255,0.22)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: 'white', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700,
    padding: '0.2rem 0.75rem',
    letterSpacing: '0.05em', textTransform: 'uppercase',
    backdropFilter: 'blur(4px)',
  },
  moduloBody:   { padding: '1.4rem 1.5rem 1.5rem' },
  moduloTitulo: { fontSize: '1.05rem', fontWeight: 800, color: '#023052', marginBottom: '0.5rem' },
  moduloDesc:   { fontSize: '0.86rem', color: '#64748b', lineHeight: 1.65, marginBottom: '1.2rem' },
  moduloBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '0.5rem 1.2rem', borderRadius: 8,
    fontSize: '0.84rem', fontWeight: 700,
    transition: 'background 0.25s, color 0.25s, box-shadow 0.25s, transform 0.25s',
    border: '1.5px solid #023052',
  },

  // Breadcrumb
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    marginBottom: '1.5rem',
    fontSize: '0.85rem', color: '#5a7a94',
  },
  breadcrumbLink: { cursor: 'pointer', color: '#023052', fontWeight: 600, textDecoration: 'underline' },
  breadcrumbSep:  { opacity: 0.5 },
}

const px = {
  wrap:  { textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: 18, border: '1px solid #e0e0e0' },
  icon:  { fontSize: '3rem', marginBottom: '1rem' },
  titulo: { fontSize: '1.2rem', fontWeight: 800, color: '#023052', marginBottom: '0.6rem' },
  desc:  { fontSize: '0.9rem', color: '#64748b' },
}
