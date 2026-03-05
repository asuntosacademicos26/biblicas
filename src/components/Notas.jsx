import { useEffect, useState } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { db } from '../config/firebase'

export default function Notas({ uid }) {
  const [notas,     setNotas]     = useState(null)
  const [titulo,    setTitulo]    = useState('')
  const [contenido, setContenido] = useState('')

  useEffect(() => {
    const notasRef = ref(db, `notas/${uid}`)
    return onValue(notasRef, snap => {
      if (!snap.exists()) { setNotas([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.creadoEn - a.creadoEn)
      setNotas(lista)
    })
  }, [uid])

  async function guardar(e) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return
    await push(ref(db, `notas/${uid}`), {
      titulo:    titulo.trim(),
      contenido: contenido.trim(),
      creadoEn:  Date.now(),
    })
    setTitulo('')
    setContenido('')
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta nota?')) return
    await remove(ref(db, `notas/${uid}/${id}`))
  }

  return (
    <>
      <div className="card">
        <h3>Nueva nota</h3>
        <form onSubmit={guardar}>
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              placeholder="Ej: Reflexión sobre Juan 3:16"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Contenido</label>
            <textarea
              placeholder="Escribe tu nota aquí..."
              value={contenido}
              onChange={e => setContenido(e.target.value)}
            />
          </div>
          <button className="btn btn-success" disabled={!titulo.trim() || !contenido.trim()}>
            Guardar nota
          </button>
        </form>
      </div>

      <div className="card">
        <h3>
          Notas guardadas
          {notas && notas.length > 0 && (
            <span style={n.count}>{notas.length}</span>
          )}
        </h3>
        {notas === null  && <p className="empty-msg">Cargando…</p>}
        {notas?.length === 0 && <p className="empty-msg">Aún no tienes notas guardadas.</p>}
        {notas?.map(nota => (
          <NotaItem key={nota.id} nota={nota} onEliminar={() => eliminar(nota.id)} />
        ))}
      </div>
    </>
  )
}

function NotaItem({ nota, onEliminar }) {
  const fecha = nota.creadoEn
    ? new Date(nota.creadoEn).toLocaleDateString('es', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : ''

  return (
    <div
      style={n.item}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#023052'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{nota.titulo}</strong>
        <p style={n.contenido}>{nota.contenido}</p>
        <span style={n.fecha}>{fecha}</span>
      </div>
      <button
        className="btn-danger-outline"
        onClick={onEliminar}
        style={{ flexShrink: 0, alignSelf: 'flex-start' }}
      >
        Eliminar
      </button>
    </div>
  )
}

const n = {
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '1rem 1.1rem', marginBottom: '0.75rem',
    transition: 'border-color 0.2s',
  },
  contenido: { fontSize: '0.87rem', color: '#64748b', marginTop: '0.3rem', lineHeight: 1.6 },
  fecha: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', display: 'block' },
  count: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ccdce8', color: '#023052',
    borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
    padding: '0.1rem 0.55rem', marginLeft: '0.5rem', verticalAlign: 'middle',
  },
}
