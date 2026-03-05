import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

export default function Notas({ uid }) {
  const [notas,     setNotas]     = useState(null) // null = cargando
  const [titulo,    setTitulo]    = useState('')
  const [contenido, setContenido] = useState('')

  useEffect(() => {
    const q = query(
      collection(db, 'notas'),
      where('uid', '==', uid),
      orderBy('creadoEn', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, err => console.error(err))
    return unsub
  }, [uid])

  async function guardar(e) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return
    await addDoc(collection(db, 'notas'), {
      uid, titulo: titulo.trim(), contenido: contenido.trim(),
      creadoEn: serverTimestamp(),
    })
    setTitulo('')
    setContenido('')
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta nota?')) return
    await deleteDoc(doc(db, 'notas', id))
  }

  return (
    <>
      {/* Formulario nueva nota */}
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

      {/* Lista */}
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
    ? new Date(nota.creadoEn.toDate()).toLocaleDateString('es', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    : ''

  return (
    <div style={estilos.item}>
      <div style={{ flex: 1 }}>
        <strong>{nota.titulo}</strong>
        <p style={{ fontSize: '0.88rem', color: '#4a5568', marginTop: '0.2rem' }}>{nota.contenido}</p>
      </div>
      <div style={estilos.meta}>
        <span style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{fecha}</span>
        <button className="btn-danger" onClick={onEliminar} title="Eliminar">✕</button>
      </div>
    </div>
  )
}

const estilos = {
  item: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem',
    background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '0.75rem 1rem', marginBottom: '0.75rem',
  },
  meta: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.4rem', minWidth:70 },
}
