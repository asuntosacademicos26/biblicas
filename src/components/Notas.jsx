import { useEffect, useState } from 'react'
import { ref, onValue, push, remove, serverTimestamp } from 'firebase/database'
import { db } from '../firebase'

export default function Notas({ uid }) {
  const [notas,     setNotas]     = useState(null)
  const [titulo,    setTitulo]    = useState('')
  const [contenido, setContenido] = useState('')

  useEffect(() => {
    // Las notas de este usuario se guardan en /notas/{uid}/
    const notasRef = ref(db, `notas/${uid}`)
    const unsub = onValue(notasRef, snap => {
      if (!snap.exists()) { setNotas([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.creadoEn - a.creadoEn)
      setNotas(lista)
    })
    return unsub
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
          <button
            className="btn btn-success"
            disabled={!titulo.trim() || !contenido.trim()}
          >
            Guardar nota
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Notas guardadas</h3>
        {notas === null && <p className="empty-msg">Cargando…</p>}
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
        day: '2-digit', month: 'short', year: 'numeric'
      })
    : ''

  return (
    <div style={estilos.item}>
      <div style={{ flex:1 }}>
        <strong>{nota.titulo}</strong>
        <p style={{ fontSize:'0.88rem', color:'#4a5568', marginTop:'0.2rem' }}>{nota.contenido}</p>
      </div>
      <div style={estilos.meta}>
        <span style={{ fontSize:'0.75rem', color:'#a0aec0' }}>{fecha}</span>
        <button className="btn-danger" onClick={onEliminar} title="Eliminar">✕</button>
      </div>
    </div>
  )
}

const estilos = {
  item: {
    display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem',
    background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8,
    padding:'0.75rem 1rem', marginBottom:'0.75rem',
  },
  meta: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.4rem', minWidth:70 },
}
