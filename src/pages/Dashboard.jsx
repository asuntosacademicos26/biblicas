import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import Notas from '../components/Notas'
import GestionUsuarios from '../components/GestionUsuarios'

export default function Dashboard({ sesion }) {
  const [tabActiva, setTabActiva] = useState('notas')
  const esAdmin = sesion.rol === 'admin'

  return (
    <div style={estilos.page}>
      {/* Header */}
      <header style={estilos.header}>
        <div>
          <h2 style={{ fontSize:'1.15rem' }}>Asuntos Bíblicos</h2>
          <div style={{ fontSize:'0.82rem', opacity:0.85 }}>
            {sesion.username} · {esAdmin ? 'Administrador' : 'Usuario'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => signOut(auth)}>
          Cerrar sesión
        </button>
      </header>

      {/* Tabs */}
      <nav style={estilos.nav}>
        <button
          className={`btn ${tabActiva === 'notas' ? 'btn-primary' : ''}`}
          style={estilos.tabBtn(tabActiva === 'notas')}
          onClick={() => setTabActiva('notas')}
        >
          Mis notas
        </button>
        {esAdmin && (
          <button
            className={`btn ${tabActiva === 'usuarios' ? 'btn-primary' : ''}`}
            style={estilos.tabBtn(tabActiva === 'usuarios')}
            onClick={() => setTabActiva('usuarios')}
          >
            Gestión de usuarios
          </button>
        )}
      </nav>

      {/* Contenido */}
      {tabActiva === 'notas'    && <Notas uid={sesion.uid} />}
      {tabActiva === 'usuarios' && esAdmin && <GestionUsuarios uidAdmin={sesion.uid} />}
    </div>
  )
}

const estilos = {
  page: { maxWidth: 780, margin: '0 auto', padding: '1rem' },
  header: {
    background: '#4a6fa5', color: 'white',
    padding: '0.9rem 1.4rem', borderRadius: 12,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '1.2rem',
  },
  nav: { display:'flex', gap:'0.5rem', marginBottom:'1.2rem', flexWrap:'wrap' },
  tabBtn: (activa) => ({
    border: activa ? 'none' : '1px solid #cbd5e0',
    background: activa ? '#4a6fa5' : 'white',
    color: activa ? 'white' : '#4a5568',
    fontSize: '0.88rem',
    padding: '0.5rem 1.1rem',
  }),
}
