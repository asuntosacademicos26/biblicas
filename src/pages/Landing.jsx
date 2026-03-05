import { useState } from 'react'
import LoginModal from '../components/LoginModal'

export default function Landing() {
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <div style={s.page}>

      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navInner}>
          <span style={s.navTitle}>Clases Bíblicas UPEU</span>
          <button
            className="btn btn-ghost"
            style={s.btnNav}
            onClick={() => setModalAbierto(true)}
          >
            Ingresar
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <span style={s.heroTag}>Universidad Peruana Unión</span>
          <h1 style={s.heroTitle}>Clases Bíblicas</h1>
          <p style={s.heroDesc}>
            Espacio de estudio, reflexión y crecimiento espiritual basado
            en las Sagradas Escrituras.
          </p>
          <button
            style={s.btnHero}
            onClick={() => setModalAbierto(true)}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
              e.currentTarget.style.transform  = 'translateY(-2px)'
              e.currentTarget.style.boxShadow  = '0 8px 28px rgba(0,0,0,0.25)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.88)'
              e.currentTarget.style.transform  = 'translateY(0)'
              e.currentTarget.style.boxShadow  = '0 4px 16px rgba(0,0,0,0.18)'
            }}
          >
            Acceder al sistema →
          </button>
        </div>
      </section>

      {/* ── Tarjetas ── */}
      <section style={s.cards}>
        <h2 style={s.sectionTitle}>¿Qué encontrarás aquí?</h2>
        <div style={s.cardsGrid}>
          <InfoCard
            icon="📖"
            titulo="Estudio de la Biblia"
            texto="Accede a materiales, notas y recursos para el estudio profundo de las Escrituras."
            color="#dbeafe"
          />
          <InfoCard
            icon="🎓"
            titulo="Clases Organizadas"
            texto="Contenido estructurado por temas y libros bíblicos para un aprendizaje sistemático."
            color="#ede9fe"
          />
          <InfoCard
            icon="🙏"
            titulo="Crecimiento Espiritual"
            texto="Herramientas para fortalecer tu fe y compartir el conocimiento con los demás."
            color="#dcfce7"
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <p>© {new Date().getFullYear()} Clases Bíblicas UPEU · Universidad Peruana Unión</p>
      </footer>

      {/* ── Modal ── */}
      {modalAbierto && <LoginModal onClose={() => setModalAbierto(false)} />}
    </div>
  )
}

function InfoCard({ icon, titulo, texto, color }) {
  return (
    <div
      style={sc.card}
      onMouseEnter={e => {
        e.currentTarget.style.transform  = 'translateY(-6px)'
        e.currentTarget.style.boxShadow  = '0 12px 32px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform  = 'translateY(0)'
        e.currentTarget.style.boxShadow  = '0 2px 12px rgba(0,0,0,0.07)'
      }}
    >
      <div style={{ ...sc.iconWrap, background: color }}>{icon}</div>
      <h3 style={sc.titulo}>{titulo}</h3>
      <p style={sc.texto}>{texto}</p>
    </div>
  )
}

/* ── Estilos ── */
const s = {
  page: {
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    background: '#EAEAEA',
  },

  // Navbar
  navbar: {
    background: 'linear-gradient(90deg, #023052 0%, #04508a 100%)',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
  },
  navInner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 2rem',
    height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navTitle: {
    fontWeight: 800, fontSize: '1.05rem', color: 'white',
    letterSpacing: '-0.01em',
  },
  btnNav: { padding: '0.45rem 1.3rem', fontSize: '0.88rem' },

  // Hero
  hero: {
    background: 'linear-gradient(135deg, #011e35 0%, #023052 60%, #04508a 100%)',
    color: 'white',
    padding: '7rem 2rem',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroInner: { maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 },
  heroTag: {
    display: 'inline-block',
    fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 99, padding: '0.3rem 1rem', marginBottom: '1.4rem',
    backdropFilter: 'blur(4px)',
  },
  heroTitle: {
    fontSize: 'clamp(2.4rem, 6vw, 3.5rem)',
    fontWeight: 900, lineHeight: 1.15,
    marginBottom: '1.2rem', letterSpacing: '-0.02em',
  },
  heroDesc: {
    fontSize: '1.1rem', opacity: 0.85,
    marginBottom: '2.4rem', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 2.4rem',
  },
  btnHero: {
    background: 'rgba(255,255,255,0.88)',
    color: '#023052',
    border: 'none', borderRadius: 10,
    padding: '0.9rem 2.4rem',
    fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
    letterSpacing: '0.01em',
  },

  // Cards
  cards: { padding: '4rem 2rem', flex: 1 },
  sectionTitle: {
    textAlign: 'center', marginBottom: '2rem',
    fontSize: '1.4rem', fontWeight: 800, color: '#023052',
    letterSpacing: '-0.01em',
  },
  cardsGrid: {
    maxWidth: 1000, margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: '1.5rem',
  },

  // Footer
  footer: {
    textAlign: 'center', padding: '1.5rem',
    color: '#94a3b8', fontSize: '0.82rem',
    borderTop: '1px solid #e2e8f0',
    background: 'white',
  },
}

const sc = {
  card: {
    background: 'white', borderRadius: 16,
    padding: '2rem 1.6rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid #f1f5f9',
    textAlign: 'center',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    cursor: 'default',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.8rem', margin: '0 auto 1.2rem',
  },
  titulo: { fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', color: '#023052' },
  texto:  { fontSize: '0.88rem', color: '#64748b', lineHeight: 1.65 },
}
