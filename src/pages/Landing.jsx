import { useState } from 'react'
import LoginModal from '../components/LoginModal'

export default function Landing() {
  const [modalAbierto, setModalAbierto] = useState(false)

  return (
    <div style={s.page}>

      {/* ── Navbar ── */}
      <nav style={s.navbar}>
        <div style={s.navInner}>
          <div style={s.navBrand}>
            <span style={s.navLogo}>✝</span>
            <span style={s.navTitle}>Clases Bíblicas UPEU</span>
          </div>
          <button
            style={s.btnIngresar}
            onClick={() => setModalAbierto(true)}
          >
            Ingresar
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <p style={s.heroTag}>Universidad Peruana Unión</p>
          <h1 style={s.heroTitle}>Clases Bíblicas</h1>
          <p style={s.heroDesc}>
            Espacio de estudio, reflexión y crecimiento espiritual basado
            en las Sagradas Escrituras.
          </p>
          <button
            style={s.btnHero}
            onClick={() => setModalAbierto(true)}
          >
            Acceder al sistema →
          </button>
        </div>
      </section>

      {/* ── Tarjetas informativas ── */}
      <section style={s.cards}>
        <div style={s.cardsGrid}>
          <InfoCard
            icon="📖"
            titulo="Estudio de la Biblia"
            texto="Accede a materiales, notas y recursos para el estudio profundo de las Escrituras."
          />
          <InfoCard
            icon="🎓"
            titulo="Clases Organizadas"
            texto="Contenido estructurado por temas y libros bíblicos para un aprendizaje sistemático."
          />
          <InfoCard
            icon="🙏"
            titulo="Crecimiento Espiritual"
            texto="Herramientas para fortalecer tu fe y compartir el conocimiento con los demás."
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <p>© {new Date().getFullYear()} Clases Bíblicas UPEU · Universidad Peruana Unión</p>
      </footer>

      {/* ── Modal Login ── */}
      {modalAbierto && (
        <LoginModal onClose={() => setModalAbierto(false)} />
      )}
    </div>
  )
}

function InfoCard({ icon, titulo, texto }) {
  return (
    <div style={sc.card}>
      <div style={sc.icon}>{icon}</div>
      <h3 style={sc.titulo}>{titulo}</h3>
      <p style={sc.texto}>{texto}</p>
    </div>
  )
}

/* ── Estilos ── */
const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' },

  // Navbar
  navbar: {
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
  },
  navInner: {
    maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem',
    height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  navLogo:  { fontSize: '1.4rem', color: '#4a6fa5' },
  navTitle: { fontWeight: 700, fontSize: '1.05rem', color: '#1a202c' },
  btnIngresar: {
    background: '#4a6fa5', color: 'white',
    border: 'none', borderRadius: 8,
    padding: '0.5rem 1.3rem',
    fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'inherit',
  },

  // Hero
  hero: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #4a6fa5 100%)',
    color: 'white',
    padding: '5rem 1.5rem',
    textAlign: 'center',
  },
  heroInner: { maxWidth: 640, margin: '0 auto' },
  heroTag:   { fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.75, marginBottom: '0.8rem' },
  heroTitle: { fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 },
  heroDesc:  { fontSize: '1.05rem', opacity: 0.88, marginBottom: '2rem', lineHeight: 1.6 },
  btnHero: {
    background: 'white', color: '#1e3a5f',
    border: 'none', borderRadius: 8,
    padding: '0.75rem 2rem',
    fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  // Cards
  cards: { padding: '3.5rem 1.5rem', flex: 1 },
  cardsGrid: {
    maxWidth: 1000, margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.5rem',
  },

  // Footer
  footer: {
    textAlign: 'center', padding: '1.5rem',
    color: '#718096', fontSize: '0.82rem',
    borderTop: '1px solid #e2e8f0',
    background: 'white',
  },
}

const sc = {
  card: {
    background: 'white', borderRadius: 12,
    padding: '1.8rem 1.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    textAlign: 'center',
  },
  icon:  { fontSize: '2.2rem', marginBottom: '1rem' },
  titulo: { fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', color: '#1a202c' },
  texto:  { fontSize: '0.88rem', color: '#4a5568', lineHeight: 1.6 },
}
