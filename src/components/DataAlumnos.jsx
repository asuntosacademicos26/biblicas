import { useEffect, useState, useRef } from 'react'
import { ref, onValue, push, remove } from 'firebase/database'
import { db } from '../config/firebase'
import * as XLSX from 'xlsx'

const CABECERAS = ['DNI','Codigo Estudiante','Nombres Completos','Carrera Profesional','Facultad','Modalidad','Ciclo','Grupo','Celular','Religion','Fecha Nacimiento (YYYY-MM-DD)','Correo']

function formatFecha(valor) {
  if (!valor) return '—'
  // Si viene como YYYY-MM-DD
  const match = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  // Si viene como número serial de Excel
  if (!isNaN(valor)) {
    const date = new Date(Math.round((Number(valor) - 25569) * 86400 * 1000))
    const d = String(date.getUTCDate()).padStart(2, '0')
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const y = date.getUTCFullYear()
    return `${d}/${m}/${y}`
  }
  return valor
}

function descargarPlantilla() {
  const ws = XLSX.utils.aoa_to_sheet([CABECERAS])
  ws['!cols'] = CABECERAS.map(() => ({ wch: 26 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')
  XLSX.writeFile(wb, 'plantilla_alumnos.xlsx')
}

export default function DataAlumnos() {
  const [alumnos,    setAlumnos]    = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [busqueda,   setBusqueda]   = useState('')
  const [importando, setImportando] = useState(false)
  const [toastImport, setToastImport] = useState(null)
  const [alumnoDetalle, setAlumnoDetalle] = useState(null)
  const [confirm, setConfirm] = useState(null) // { paso, titulo, msg, onConfirm }
  const fileInputRef = useRef(null)

  useEffect(() => {
    return onValue(ref(db, 'dataAlumnos'), snap => {
      if (!snap.exists()) { setAlumnos([]); return }
      const lista = Object.entries(snap.val())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.creadoEn - a.creadoEn)
      setAlumnos(lista)
    })
  }, [])

  async function manejarExcel(e) {
    const file = e.target.files[0]
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    if (!file) return

    setImportando(true)
    setToastImport(null)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      // Detectar fila de cabecera (primera fila)
      const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim() !== ''))
      if (dataRows.length === 0) {
        setToastImport({ tipo: 'error', msg: 'El archivo no tiene datos.' })
        return
      }

      let guardados = 0
      for (const row of dataRows) {
        const [dni, codigoEstudiante, nombresCompletos, escuelaProfesional, facultad, modalidad, ciclo, grupo, celular, religion, fechaNacimiento, correo] =
          CABECERAS.map((_, i) => String(row[i] ?? '').trim())
        const partes = nombresCompletos.trim().split(/\s+/)
        const nombre = partes[0] || ''
        const apellido = partes.slice(1).join(' ')
        const alumno = { dni, codigoEstudiante, nombre, apellido, escuelaProfesional, facultad, modalidad, ciclo, grupo, celular, religion, fechaNacimiento, correo }
        if (!nombre) continue
        await push(ref(db, 'dataAlumnos'), { ...alumno, creadoEn: Date.now() })
        guardados++
      }
      setToastImport({ tipo: 'success', msg: `${guardados} alumno(s) importados correctamente.` })
    } catch {
      setToastImport({ tipo: 'error', msg: 'Error al procesar el archivo Excel.' })
    } finally {
      setImportando(false)
      setTimeout(() => setToastImport(null), 4000)
    }
  }

  function eliminar(id, nombre) {
    setConfirm({
      paso: 1,
      titulo: 'Eliminar alumno',
      msg: `El alumno "${nombre}" será eliminado de manera permanente.`,
      onConfirm: () => setConfirm({
        paso: 2,
        titulo: '¿Estás seguro?',
        msg: `Esta acción no se puede deshacer. ¿Confirmas eliminar a "${nombre}"?`,
        onConfirm: async () => {
          await remove(ref(db, `dataAlumnos/${id}`))
          setConfirm(null)
        },
      }),
    })
  }

  function vaciarAlumnos() {
    setConfirm({
      paso: 1,
      titulo: 'Vaciar todos los alumnos',
      msg: 'Todos los alumnos registrados serán eliminados de manera permanente.',
      onConfirm: () => setConfirm({
        paso: 2,
        titulo: '¿Estás completamente seguro?',
        msg: 'Esta acción eliminará todos los alumnos y no se puede deshacer. ¿Confirmas?',
        onConfirm: async () => {
          await remove(ref(db, 'dataAlumnos'))
          setConfirm(null)
        },
      }),
    })
  }

  const filtrados = busqueda.trim()
    ? (alumnos?.filter(a => {
        const q = busqueda.toLowerCase()
        return (
          `${a.nombre} ${a.apellido}`.toLowerCase().includes(q) ||
          (a.codigoEstudiante || '').toLowerCase().includes(q) ||
          (a.dni || '').includes(q)
        )
      }) ?? [])
    : (alumnos?.slice(0, 5) ?? [])

  return (
    <>
      <div className="card">
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
            Data de Alumnos
            {alumnos && alumnos.length > 0 && (
              <span style={s.countBadge}>{alumnos.length}</span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {alumnos && alumnos.length > 0 && (
              <button style={{ ...s.btnOutline, color: '#ef4444', borderColor: '#fecaca' }} onClick={vaciarAlumnos}>
                <IconTrash /> Vaciar alumnos
              </button>
            )}
            <button style={s.btnOutline} onClick={descargarPlantilla}>
              <IconExcel /> Plantilla Excel
            </button>
            <button style={s.btnOutline} disabled={importando} onClick={() => fileInputRef.current?.click()}>
              <IconUpload /> {importando ? 'Importando…' : 'Subir Excel'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={manejarExcel}
            />
            <button className="btn btn-primary" style={s.btnSm} onClick={() => setModalAbierto(true)}>
              + Agregar alumno
            </button>
          </div>
        </div>

        {toastImport && (
          <div className={`alert alert-${toastImport.tipo}`} style={{ marginBottom: '0.75rem' }}>
            {toastImport.msg}
          </div>
        )}

        {/* Buscador */}
        {alumnos && alumnos.length > 0 && (
          <div style={s.searchWrap}>
            <span style={s.searchIcon}><IconSearch /></span>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre, escuela o facultad…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
        )}

        {alumnos === null && <p className="empty-msg">Cargando…</p>}
        {alumnos?.length === 0 && <p className="empty-msg">No hay alumnos registrados aún.</p>}

        {alumnos && alumnos.length > 0 && filtrados.length === 0 && (
          <p className="empty-msg">No se encontraron resultados para "{busqueda}".</p>
        )}

        {filtrados.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre completo</th>
                  <th>DNI</th>
                  <th>Cód. Estudiante</th>
                  <th>Carrera profesional</th>
                  <th>Facultad</th>
                  <th>F. Nacimiento</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr key={a.id}>
                    <td style={{ color: '#94a3b8', width: 36 }}>{i + 1}</td>
                    <td>
                      <strong style={{ color: '#023052' }}>{a.nombre} {a.apellido}</strong>
                    </td>
                    <td style={{ color: '#475569' }}>{a.dni || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.codigoEstudiante || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.escuelaProfesional || '—'}</td>
                    <td style={{ color: '#475569' }}>{a.facultad || '—'}</td>
                    <td style={{ color: '#475569' }}>{formatFecha(a.fechaNacimiento)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button style={s.iconBtn} title="Ver / Editar" onClick={() => setAlumnoDetalle(a)}>
                          <IconInfo />
                        </button>
                        <button style={{ ...s.iconBtn, ...s.iconBtnDanger }} title="Eliminar" onClick={() => eliminar(a.id, `${a.nombre} ${a.apellido}`)}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!busqueda.trim() && alumnos && alumnos.length > 5 && (
              <p style={s.masAlumnos}>
                Mostrando los 5 últimos registros. Usa el buscador para encontrar alumnos específicos.
              </p>
            )}
          </div>
        )}
      </div>

      {modalAbierto && (
        <ModalAgregarAlumno onClose={() => setModalAbierto(false)} />
      )}
      {alumnoDetalle && (
        <ModalDetalleAlumno alumno={alumnoDetalle} onClose={() => setAlumnoDetalle(null)} />
      )}

      {confirm && (
        <div
          style={confirm.paso === 2 ? mc.backdropRojo : mc.backdrop}
          onClick={e => { if (e.target === e.currentTarget) setConfirm(null) }}
        >
          <div style={confirm.paso === 2 ? mc.boxRojo : mc.box}>
            <div style={confirm.paso === 2 ? mc.iconWrapRojo : mc.iconWrap}>
              <IconAlerta />
            </div>
            <h3 style={confirm.paso === 2 ? mc.tituloRojo : mc.titulo}>{confirm.titulo}</h3>
            <p style={confirm.paso === 2 ? mc.msgRojo : mc.msg}>{confirm.msg}</p>
            <div style={mc.btns}>
              <button style={mc.btnCancelar} onClick={() => setConfirm(null)}>Cancelar</button>
              <button
                style={confirm.paso === 2 ? mc.btnEliminarRojo : mc.btnEliminar}
                onClick={confirm.onConfirm}
              >
                {confirm.paso === 1 ? 'Eliminar de todas maneras' : 'Sí, eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Modal agregar alumno ── */
function ModalAgregarAlumno({ onClose }) {
  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', codigoEstudiante: '', escuelaProfesional: '', facultad: '',
    modalidad: '', ciclo: '', grupo: '', fechaNacimiento: '', correo: '', celular: '', religion: '',
  })
  const [facultades, setFacultades] = useState([])
  const [estado,     setEstado]     = useState(null)
  const [cargando,   setCargando]   = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Escuelas de la facultad seleccionada
  const facultadSeleccionada = facultades.find(f => f.nombre === form.facultad)
  const escuelas = facultadSeleccionada?.escuelas || []

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Cargar facultades desde Firebase
  useEffect(() => {
    return onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      setFacultades(Object.values(snap.val()))
    })
  }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim())
      return setEstado({ tipo: 'error', msg: 'Nombre y apellido son obligatorios.' })

    setCargando(true)
    setEstado(null)
    try {
      await push(ref(db, 'dataAlumnos'), { ...form, creadoEn: Date.now() })
      setEstado({ tipo: 'success', msg: `Alumno "${form.nombre} ${form.apellido}" registrado.` })
      setForm({ nombre: '', apellido: '', dni: '', codigoEstudiante: '', escuelaProfesional: '', facultad: '', modalidad: '', ciclo: '', grupo: '', fechaNacimiento: '', correo: '', celular: '', religion: '' })
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar el alumno.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>

        <div style={m.header}>
          <div>
            <h2 style={m.title}>Agregar alumno</h2>
            <p style={m.subtitle}>Completa los datos del alumno</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={guardar}>

            {/* Sección datos personales */}
            <div style={m.seccionLabel}><IconPersona /> Datos personales</div>
            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Nombre <Req /></label>
                <input placeholder="Juan" value={form.nombre} onChange={set_('nombre')} autoFocus />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Apellido <Req /></label>
                <input placeholder="Pérez" value={form.apellido} onChange={set_('apellido')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>DNI</label>
                <input placeholder="12345678" maxLength={8} value={form.dni} onChange={set_('dni')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Código de estudiante</label>
                <input placeholder="2024100001" value={form.codigoEstudiante} onChange={set_('codigoEstudiante')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Fecha de nacimiento</label>
                <input type="date" value={form.fechaNacimiento} onChange={set_('fechaNacimiento')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Celular</label>
                <input placeholder="987654321" value={form.celular} onChange={set_('celular')} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Religión</label>
              <select value={form.religion} onChange={set_('religion')}>
                <option value="">— Seleccionar —</option>
                <option value="Adventista del Séptimo Día">Adventista del Séptimo Día</option>
                <option value="Católico">Católico</option>
                <option value="Otro">Otro</option>
                <option value="Ninguno">Ninguno</option>
              </select>
            </div>

            {/* Sección datos académicos */}
            <div style={{ ...m.seccionLabel, marginTop: '1.2rem' }}><IconAcademico /> Datos académicos</div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Facultad</label>
              <select
                value={form.facultad}
                onChange={e => setForm(f => ({ ...f, facultad: e.target.value, escuelaProfesional: '' }))}
              >
                <option value="">— Seleccionar facultad —</option>
                {facultades.map((f, i) => (
                  <option key={i} value={f.nombre}>{f.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Carrera profesional</label>
              <select
                value={form.escuelaProfesional}
                onChange={set_('escuelaProfesional')}
                disabled={!form.facultad || escuelas.length === 0}
              >
                <option value="">
                  {!form.facultad ? '— Selecciona una facultad primero —' : escuelas.length === 0 ? '— Sin escuelas registradas —' : '— Seleccionar carrera —'}
                </option>
                {escuelas.map((e, i) => (
                  <option key={i} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Modalidad</label>
              <select value={form.modalidad} onChange={set_('modalidad')}>
                <option value="">— Seleccionar —</option>
                <option value="A distancia">A distancia</option>
                <option value="Online">Online</option>
                <option value="Presencial">Presencial</option>
                <option value="Semipresencial">Semipresencial</option>
              </select>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Ciclo</label>
                <select value={form.ciclo} onChange={set_('ciclo')}>
                  <option value="">— Seleccionar —</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}° ciclo</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Grupo</label>
                <select value={form.grupo} onChange={set_('grupo')}>
                  <option value="">— Seleccionar —</option>
                  <option value="Único">Único</option>
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>Grupo {n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cancelar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Agregar alumno'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Modal detalle / editar alumno ── */
function ModalDetalleAlumno({ alumno, onClose }) {
  const [form, setForm] = useState({ ...alumno })
  const [facultades, setFacultades] = useState([])
  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(false)

  const set_ = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const facultadSeleccionada = facultades.find(f => f.nombre === form.facultad)
  const escuelas = facultadSeleccionada?.escuelas || []

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    return onValue(ref(db, 'facultades'), snap => {
      if (!snap.exists()) { setFacultades([]); return }
      setFacultades(Object.values(snap.val()))
    })
  }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim())
      return setEstado({ tipo: 'error', msg: 'Nombre y apellido son obligatorios.' })
    setCargando(true)
    setEstado(null)
    try {
      const { id, ...datos } = form
      await import('firebase/database').then(({ set, ref: dbRef }) =>
        set(dbRef(db, `dataAlumnos/${alumno.id}`), { ...datos, creadoEn: alumno.creadoEn ?? Date.now() })
      )
      setEstado({ tipo: 'success', msg: 'Datos actualizados correctamente.' })
    } catch {
      setEstado({ tipo: 'error', msg: 'Error al guardar los cambios.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={m.backdrop} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>{alumno.nombre} {alumno.apellido}</h2>
            <p style={m.subtitle}>Ver y editar información del alumno</p>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={m.body}>
          {estado && <div className={`alert alert-${estado.tipo}`}>{estado.msg}</div>}

          <form onSubmit={guardar}>
            <div style={m.seccionLabel}><IconPersona /> Datos personales</div>
            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Nombre <Req /></label>
                <input value={form.nombre} onChange={set_('nombre')} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Apellido <Req /></label>
                <input value={form.apellido} onChange={set_('apellido')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>DNI</label>
                <input maxLength={8} value={form.dni || ''} onChange={set_('dni')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Código de estudiante</label>
                <input value={form.codigoEstudiante || ''} onChange={set_('codigoEstudiante')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Fecha de nacimiento</label>
                <input type="date" value={form.fechaNacimiento || ''} onChange={set_('fechaNacimiento')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Celular</label>
                <input value={form.celular || ''} onChange={set_('celular')} />
              </div>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Correo electrónico</label>
                <input type="email" value={form.correo || ''} onChange={set_('correo')} />
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Religión</label>
                <select value={form.religion || ''} onChange={set_('religion')}>
                  <option value="">— Seleccionar —</option>
                  <option value="Adventista del Séptimo Día">Adventista del Séptimo Día</option>
                  <option value="Católico">Católico</option>
                  <option value="Otro">Otro</option>
                  <option value="Ninguno">Ninguno</option>
                </select>
              </div>
            </div>

            <div style={{ ...m.seccionLabel, marginTop: '1.2rem' }}><IconAcademico /> Datos académicos</div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Facultad</label>
              <select value={form.facultad || ''} onChange={e => setForm(f => ({ ...f, facultad: e.target.value, escuelaProfesional: '' }))}>
                <option value="">— Seleccionar facultad —</option>
                {facultades.map((f, i) => <option key={i} value={f.nombre}>{f.nombre}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Carrera profesional</label>
              <select value={form.escuelaProfesional || ''} onChange={set_('escuelaProfesional')} disabled={!form.facultad || escuelas.length === 0}>
                <option value="">{!form.facultad ? '— Selecciona una facultad primero —' : escuelas.length === 0 ? '— Sin escuelas registradas —' : '— Seleccionar carrera —'}</option>
                {escuelas.map((e, i) => <option key={i} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.9rem' }}>
              <label>Modalidad</label>
              <select value={form.modalidad || ''} onChange={set_('modalidad')}>
                <option value="">— Seleccionar —</option>
                <option value="A distancia">A distancia</option>
                <option value="Online">Online</option>
                <option value="Presencial">Presencial</option>
                <option value="Semipresencial">Semipresencial</option>
              </select>
            </div>

            <div style={m.grid2}>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Ciclo</label>
                <select value={form.ciclo || ''} onChange={set_('ciclo')}>
                  <option value="">— Seleccionar —</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}° ciclo</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, marginTop: '0.9rem' }}>
                <label>Grupo</label>
                <select value={form.grupo || ''} onChange={set_('grupo')}>
                  <option value="">— Seleccionar —</option>
                  <option value="Único">Único</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Grupo {n}</option>)}
                </select>
              </div>
            </div>

            <div style={m.footer}>
              <button type="button" style={m.btnCancelar} onClick={onClose}>Cerrar</button>
              <button className="btn btn-success" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ── */
function Req() {
  return <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
}
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconExcel() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
}
function IconUpload() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
}
function IconAlerta() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function IconInfo() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
}
function IconTrash() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function IconPersona() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconAcademico() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
}

/* ── Estilos ── */
const s = {
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },
  btnSm:      { padding: '0.45rem 1.1rem', fontSize: '0.86rem' },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.45rem 1rem', fontSize: '0.84rem', fontWeight: 600,
    border: '1.5px solid #cbd5e1', borderRadius: 9, background: 'white',
    color: '#023052', cursor: 'pointer', fontFamily: 'inherit',
  },
  countBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ccdce8', color: '#023052', borderRadius: 99,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.55rem', marginLeft: '0.5rem',
  },
  searchWrap: {
    position: 'relative', marginBottom: '1rem',
  },
  searchIcon: {
    position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)',
    display: 'flex', pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '2.2rem', background: '#f8fafc',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e2e8f0',
    background: 'white', color: '#023052', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
  iconBtnDanger: {
    color: '#ef4444', borderColor: '#fecaca',
  },
  masAlumnos: {
    textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8',
    marginTop: '0.75rem', fontStyle: 'italic',
  },
  nombreCell: { display: 'flex', alignItems: 'center', gap: '0.65rem' },
  avatar: {
    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #023052, #04508a)',
    color: 'white', fontWeight: 800, fontSize: '0.78rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

const m = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, animation: 'fadeIn 0.18s ease',
  },
  modal: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 18, width: '100%', maxWidth: 500, margin: '1rem',
    boxShadow: '0 8px 40px rgba(2,48,82,0.18)',
    animation: 'slideUp 0.22s ease', overflow: 'hidden',
    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.5rem 1.6rem 1.2rem',
    background: 'linear-gradient(135deg, #011e35 0%, #023052 100%)', flexShrink: 0,
  },
  title:    { fontSize: '1.2rem', color: 'white', fontWeight: 800, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.3)' },
  subtitle: { fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.2rem' },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
    color: 'white', cursor: 'pointer', borderRadius: 8,
    width: 30, height: 30, fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', flexShrink: 0,
  },
  body:  { padding: '1.6rem', overflowY: 'auto' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' },
  seccionLabel: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    fontSize: '0.78rem', fontWeight: 700, color: '#023052',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '0.8rem', paddingBottom: '0.5rem',
    borderBottom: '1.5px solid #e2e8f0',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
  btnCancelar: {
    padding: '0.6rem 1.3rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.92rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
}

const mc = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, animation: 'fadeIn 0.18s ease',
  },
  backdropRojo: {
    position: 'fixed', inset: 0, background: 'rgba(180,20,20,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, animation: 'fadeIn 0.18s ease',
  },
  box: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 20, padding: '2.5rem 2.2rem',
    maxWidth: 460, width: '100%', margin: '1rem',
    boxShadow: '0 28px 72px rgba(2,48,82,0.35)',
    animation: 'slideUp 0.22s ease', textAlign: 'center',
  },
  boxRojo: {
    background: 'rgba(255,235,235,0.78)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    border: '2px solid rgba(239,68,68,0.5)',
    borderRadius: 20, padding: '2.5rem 2.2rem',
    maxWidth: 460, width: '100%', margin: '1rem',
    boxShadow: '0 28px 72px rgba(180,20,20,0.4)',
    animation: 'slideUp 0.22s ease', textAlign: 'center',
  },
  iconWrap: {
    width: 70, height: 70, borderRadius: '50%',
    background: '#fef2f2', color: '#ef4444',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.2rem',
  },
  iconWrapRojo: {
    width: 70, height: 70, borderRadius: '50%',
    background: 'rgba(239,68,68,0.15)', color: '#dc2626',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.2rem',
  },
  titulo: { fontSize: '1.25rem', fontWeight: 800, color: '#023052', margin: '0 0 0.7rem' },
  tituloRojo: { fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', margin: '0 0 0.7rem' },
  msg:    { fontSize: '0.95rem', color: '#64748b', margin: '0 0 1.8rem', lineHeight: 1.6 },
  msgRojo: { fontSize: '0.95rem', color: '#7f1d1d', margin: '0 0 1.8rem', lineHeight: 1.6 },
  btns:   { display: 'flex', gap: '0.7rem', justifyContent: 'center' },
  btnCancelar: {
    padding: '0.7rem 1.6rem', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: 'white',
    color: '#64748b', fontWeight: 600, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnEliminar: {
    padding: '0.7rem 1.6rem', borderRadius: 10,
    border: 'none', background: '#ef4444',
    color: 'white', fontWeight: 700, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnEliminarRojo: {
    padding: '0.7rem 1.6rem', borderRadius: 10,
    border: '2px solid #dc2626', background: '#dc2626',
    color: 'white', fontWeight: 700, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
  },
}
