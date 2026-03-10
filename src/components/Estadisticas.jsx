import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../config/firebase'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Title,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

/* ── Paleta viva por facultad ── */
const PALETA = [
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#ef4444',
  '#22c55e','#3b82f6','#a855f7','#f97316','#06b6d4',
  '#84cc16','#e879f9','#fb7185','#34d399','#60a5fa',
]

/* ── Colores fijos estado espiritual ── */
const C_ASD      = '#2563eb'
const C_OTRAS    = '#ea580c'
const C_RECIENTE = '#9333ea'
const C_DECIDIO  = '#16a34a'

/* ── Helpers religión / estado ── */
function esRecientePorFecha(fechaBautizo) {
  if (!fechaBautizo) return true
  const inicio = new Date(fechaBautizo + 'T00:00:00')
  const limite = new Date(inicio)
  limite.setMonth(limite.getMonth() + 6)
  return new Date() <= limite
}

function clasificarReligion(religion) {
  const r = (religion || '').toLowerCase().trim()
  if (!r || ['ninguna','sin religion','sin religión','no','ninguno','ateo','atea','agnóstico','agnostico','ninguna religion'].includes(r))
    return 'sin'
  if (r.includes('adventist') || r.includes('bautizad'))
    return 'bautizados'
  return 'otras'
}

function contarEstados(alumnosRaw, dataAlumnos) {
  let bautizados = 0, otras = 0, recientes = 0, decidio = 0
  Object.values(alumnosRaw || {}).forEach(a => {
    const match = dataAlumnos.find(d =>
      (a.dni && d.dni === a.dni) ||
      (a.codigoEstudiante && d.codigoEstudiante === a.codigoEstudiante)
    )
    const religion = (match?.religion || a.religion || '').trim()
    const programa  = a.programaBautizo || ''
    if (programa === 'Se bautizó') {
      if (esRecientePorFecha(a.fechaBautizo)) {
        recientes++
      } else {
        bautizados++ // pasaron 6 meses → pasa a bautizados ASD normales
      }
    } else {
      const cat = clasificarReligion(religion)
      if (cat === 'bautizados') bautizados++
      else if (cat === 'otras')  otras++
    }
    if (programa === 'Decidió') decidio++
  })
  return { bautizados, otras, recientes, decidio }
}

export default function Estadisticas() {
  const [clases,      setClases]      = useState(null)
  const [usuarios,    setUsuarios]    = useState([])
  const [facultades,  setFacultades]  = useState([])
  const [dataAlumnos, setDataAlumnos] = useState([])

  useEffect(() => onValue(ref(db, 'clases'), snap => {
    if (!snap.exists()) { setClases([]); return }
    setClases(Object.entries(snap.val()).map(([id, d]) => ({
      id, ...d,
      alumnosCount: d.alumnos ? Object.keys(d.alumnos).length : 0,
      alumnosRaw:   d.alumnos || {},
    })))
  }), [])

  useEffect(() => onValue(ref(db, 'usuarios'), snap => {
    if (!snap.exists()) { setUsuarios([]); return }
    setUsuarios(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
  }), [])

  useEffect(() => onValue(ref(db, 'facultades'), snap => {
    if (!snap.exists()) { setFacultades([]); return }
    setFacultades(Object.values(snap.val()).sort((a, b) => a.nombre.localeCompare(b.nombre)))
  }), [])

  useEffect(() => onValue(ref(db, 'dataAlumnos'), snap => {
    if (!snap.exists()) { setDataAlumnos([]); return }
    setDataAlumnos(Object.entries(snap.val()).map(([id, d]) => ({ id, ...d })))
  }), [])

  if (clases === null) return <p className="empty-msg">Cargando estadísticas…</p>

  /* ── Métricas globales ── */
  const totalAlumnos     = clases.reduce((s, c) => s + c.alumnosCount, 0)
  const docentesConClase = new Set(clases.map(c => c.docenteId).filter(Boolean))

  let gBautizados = 0, gOtras = 0, gRecientes = 0, gDecidio = 0
  clases.forEach(c => {
    const est = contarEstados(c.alumnosRaw, dataAlumnos)
    gBautizados += est.bautizados
    gOtras      += est.otras
    gRecientes  += est.recientes
    gDecidio    += est.decidio
  })

  /* ── Agrupación por facultad ── */
  const porFacultad = {}
  clases.forEach(c => {
    const fac = c.facultad || 'Sin facultad'
    const esc = c.escuela  || 'Sin escuela'
    if (!porFacultad[fac]) porFacultad[fac] = {
      clases: 0, alumnos: 0, docentes: new Set(), escuelas: {},
      bautizados: 0, otras: 0, recientes: 0, decidio: 0,
    }
    const est = contarEstados(c.alumnosRaw, dataAlumnos)
    porFacultad[fac].clases++
    porFacultad[fac].alumnos    += c.alumnosCount
    porFacultad[fac].bautizados += est.bautizados
    porFacultad[fac].otras      += est.otras
    porFacultad[fac].recientes  += est.recientes
    porFacultad[fac].decidio    += est.decidio
    if (c.docenteId) porFacultad[fac].docentes.add(c.docenteId)

    if (!porFacultad[fac].escuelas[esc]) porFacultad[fac].escuelas[esc] = {
      clases: 0, alumnos: 0, docentes: new Set(),
      bautizados: 0, otras: 0, recientes: 0, decidio: 0,
    }
    porFacultad[fac].escuelas[esc].clases++
    porFacultad[fac].escuelas[esc].alumnos    += c.alumnosCount
    porFacultad[fac].escuelas[esc].bautizados += est.bautizados
    porFacultad[fac].escuelas[esc].otras      += est.otras
    porFacultad[fac].escuelas[esc].recientes  += est.recientes
    porFacultad[fac].escuelas[esc].decidio    += est.decidio
    if (c.docenteId) porFacultad[fac].escuelas[esc].docentes.add(c.docenteId)
  })

  const facOrdenadas = Object.entries(porFacultad).sort((a, b) => {
    const ai = facultades.findIndex(f => f.nombre === a[0])
    const bi = facultades.findIndex(f => f.nombre === b[0])
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0])
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const labels   = facOrdenadas.map(([n]) => n)
  const colores  = labels.map((_, i) => PALETA[i % PALETA.length])
  const coloresA = colores.map(c => c + 'dd')

  /* ── Datos para gráficos ── */
  const barClasesData = {
    labels,
    datasets: [{
      label: 'Clases',
      data: facOrdenadas.map(([, d]) => d.clases),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  const barDocentesData = {
    labels,
    datasets: [{
      label: 'Docentes',
      data: facOrdenadas.map(([, d]) => d.docentes.size),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  /* Doughnut con número en leyenda */
  const doughnutLabels = facOrdenadas.map(([n, d]) => `${n}  ·  ${d.alumnos}`)
  const doughnutAlumnosData = {
    labels: doughnutLabels,
    datasets: [{
      data: facOrdenadas.map(([, d]) => d.alumnos),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      hoverOffset: 8,
    }],
  }

  const barAlumnosData = {
    labels,
    datasets: [{
      label: 'Alumnos',
      data: facOrdenadas.map(([, d]) => d.alumnos),
      backgroundColor: coloresA,
      borderColor: colores,
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  /* Gráfico estado espiritual — etiqueta con total global */
  const barEstadoData = {
    labels,
    datasets: [
      {
        label: `Bautizados ASD  ·  ${gBautizados}`,
        data: facOrdenadas.map(([, d]) => d.bautizados),
        backgroundColor: C_ASD + 'dd',
        borderColor: C_ASD,
        borderWidth: 2,
        borderRadius: 4,
        stack: 'estado',
      },
      {
        label: `Otras religiones  ·  ${gOtras}`,
        data: facOrdenadas.map(([, d]) => d.otras),
        backgroundColor: C_OTRAS + 'dd',
        borderColor: C_OTRAS,
        borderWidth: 2,
        borderRadius: 4,
        stack: 'estado',
      },
      {
        label: `Recién bautizados  ·  ${gRecientes}`,
        data: facOrdenadas.map(([, d]) => d.recientes),
        backgroundColor: C_RECIENTE + 'dd',
        borderColor: C_RECIENTE,
        borderWidth: 2,
        borderRadius: 4,
        stack: 'estado',
      },
      {
        label: `Decidió  ·  ${gDecidio}`,
        data: facOrdenadas.map(([, d]) => d.decidio),
        backgroundColor: C_DECIDIO + 'dd',
        borderColor: C_DECIDIO,
        borderWidth: 2,
        borderRadius: 4,
        stack: 'estado',
      },
    ],
  }

  /* ── Opciones de gráficos ── */
  const barOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: { title: ([i]) => i.label },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 35, minRotation: 0 },
        border: { display: false },
      },
      y: {
        grid: { color: '#f1f5f9', lineWidth: 1 },
        ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  })

  const barEstadoOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: { size: 11, weight: '600' },
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 3,
          padding: 14,
          color: '#334155',
          useBorderRadius: true,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: { title: ([i]) => i.label },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 35, minRotation: 0 },
        border: { display: false },
      },
      y: {
        stacked: true,
        grid: { color: '#f1f5f9', lineWidth: 1 },
        ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { size: 11, weight: '600' },
          boxWidth: 12,
          boxHeight: 12,
          padding: 14,
          color: '#334155',
          useBorderRadius: true,
          borderRadius: 3,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
      },
    },
  }

  return (
    <div>
      {/* ── Sección: resumen general ── */}
      <div style={s.secLabel}>Resumen general</div>
      <div style={s.globalGrid}>
        <MetricaCard valor={clases.length}         label="Clases bíblicas"        color="#6366f1" />
        <MetricaCard valor={docentesConClase.size}  label="Docentes con clase"      color="#0ea5e9" />
        <MetricaCard valor={totalAlumnos}           label="Alumnos en total"        color="#a855f7" />
        <MetricaCard valor={facOrdenadas.length}    label="Facultades participando" color="#f59e0b" />
      </div>

      {/* ── Sección: estado espiritual ── */}
      <div style={s.secLabel}>Estado espiritual</div>
      <div style={s.globalGrid}>
        <MetricaCard valor={gBautizados} label="Ya bautizados (ASD)"    color={C_ASD}      />
        <MetricaCard valor={gOtras}      label="Otras religiones"        color={C_OTRAS}    />
        <MetricaCard valor={gRecientes}  label="Recién bautizados"       color={C_RECIENTE} />
        <MetricaCard valor={gDecidio}    label="Decidieron bautizarse"   color={C_DECIDIO}  />
      </div>

      {/* ── Gráficos ── */}
      {facOrdenadas.length > 0 && (
        <>
          <div style={s.chartRow}>
            <div className="card" style={s.chartCard}>
              <div style={s.chartTitleRow}>
                <div style={s.chartDot} />
                <span style={s.chartTitle}>Clases por facultad</span>
              </div>
              <div style={s.chartWrap}>
                <Bar data={barClasesData} options={barOpts()} />
              </div>
            </div>
            <div className="card" style={s.chartCard}>
              <div style={s.chartTitleRow}>
                <div style={{ ...s.chartDot, background: '#0ea5e9' }} />
                <span style={s.chartTitle}>Docentes por facultad</span>
              </div>
              <div style={s.chartWrap}>
                <Bar data={barDocentesData} options={barOpts()} />
              </div>
            </div>
          </div>

          <div style={s.chartRow}>
            <div className="card" style={{ ...s.chartCard, flex: '1 1 340px' }}>
              <div style={s.chartTitleRow}>
                <div style={{ ...s.chartDot, background: '#a855f7' }} />
                <span style={s.chartTitle}>Distribución de alumnos</span>
              </div>
              <div style={{ ...s.chartWrap, height: 270 }}>
                <Doughnut data={doughnutAlumnosData} options={doughnutOpts} />
              </div>
            </div>
            <div className="card" style={{ ...s.chartCard, flex: '2 1 420px' }}>
              <div style={s.chartTitleRow}>
                <div style={{ ...s.chartDot, background: '#f59e0b' }} />
                <span style={s.chartTitle}>Alumnos por facultad</span>
              </div>
              <div style={s.chartWrap}>
                <Bar data={barAlumnosData} options={barOpts()} />
              </div>
            </div>
          </div>

          <div style={s.chartRow}>
            <div className="card" style={{ ...s.chartCard, flex: '1 1 100%' }}>
              <div style={s.chartTitleRow}>
                <div style={{ ...s.chartDot, background: C_RECIENTE }} />
                <span style={s.chartTitle}>Estado espiritual por facultad</span>
                <span style={s.chartSubtitle}>el total global se muestra en la leyenda</span>
              </div>
              <div style={{ ...s.chartWrap, height: 280 }}>
                <Bar data={barEstadoData} options={barEstadoOpts} />
              </div>
            </div>
          </div>

          {/* ── Gráficos por facultad → escuelas ── */}
          <div style={s.secLabel}>Alumnos por escuela dentro de cada facultad</div>
          <div style={s.facGrid}>
            {facOrdenadas.map(([facNombre, facData], fi) => {
              const escOrdenadas = Object.entries(facData.escuelas).sort((a, b) => a[0].localeCompare(b[0]))
              const escLabels   = escOrdenadas.map(([n]) => n)
              const escColores  = escLabels.map((_, i) => PALETA[(fi * 3 + i) % PALETA.length])
              const escColoresA = escColores.map(c => c + 'dd')
              const escData = {
                labels: escLabels,
                datasets: [{
                  label: 'Alumnos',
                  data: escOrdenadas.map(([, d]) => d.alumnos),
                  backgroundColor: escColoresA,
                  borderColor: escColores,
                  borderWidth: 2,
                  borderRadius: 6,
                }],
              }
              return (
                <div key={facNombre} className="card" style={s.facChartCard}>
                  <div style={{ ...s.facChartHeader, borderLeft: `4px solid ${PALETA[fi % PALETA.length]}` }}>
                    <div style={s.facChartTitle}>{facNombre}</div>
                    <div style={s.facChartMeta}>
                      {facData.clases} clases · {facData.alumnos} alumnos · {facData.docentes.size} docentes
                    </div>
                  </div>
                  <div style={{ height: 210 }}>
                    <Bar data={escData} options={barOpts()} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Tabla por facultad / escuela ── */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <div style={s.cardHeader}>
          <h3 style={{ margin: 0, borderBottom: 'none', padding: 0, color: '#1e293b' }}>
            Detalle por Facultad y Escuela
          </h3>
        </div>
        {facOrdenadas.length === 0 && <p className="empty-msg">No hay clases registradas aún.</p>}
        {facOrdenadas.map(([facNombre, facData], fi) => (
          <FacultadBloque
            key={facNombre}
            nombre={facNombre}
            data={facData}
            usuarios={usuarios}
            color={PALETA[fi % PALETA.length]}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Bloque por facultad ── */
function FacultadBloque({ nombre, data, usuarios, color }) {
  const [abierto, setAbierto] = useState(true)
  const escuelas = Object.entries(data.escuelas).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div style={s.facBloque}>
      <div style={{ ...s.facHeader, borderLeft: `4px solid ${color}` }} onClick={() => setAbierto(v => !v)}>
        <div style={s.facLeft}>
          <div style={{ ...s.facDot, background: color }} />
          <div>
            <div style={s.facNombre}>{nombre}</div>
            <div style={s.facMeta}>
              {data.clases} clase{data.clases !== 1 ? 's' : ''} · {data.docentes.size} docente{data.docentes.size !== 1 ? 's' : ''} · {data.alumnos} alumno{data.alumnos !== 1 ? 's' : ''}
              {data.bautizados > 0 && ` · ${data.bautizados} ASD`}
              {data.recientes  > 0 && ` · 🎉 ${data.recientes} recién bautizados`}
              {data.decidio    > 0 && ` · ${data.decidio} decidió`}
            </div>
          </div>
        </div>
        <div style={s.facRight}>
          <span style={{ ...s.pill, background: color + '20', color, border: `1px solid ${color}44` }}>
            {data.clases} clases
          </span>
          <span style={s.pillCyan}>{data.docentes.size} docentes</span>
          <span style={s.pillPurple}>{data.alumnos} alumnos</span>
          {data.bautizados > 0 && <span style={s.pillBlue}>{data.bautizados} ASD</span>}
          {data.otras      > 0 && <span style={s.pillOrange}>{data.otras} otras</span>}
          {data.recientes  > 0 && <span style={s.pillViolet}>🎉 {data.recientes}</span>}
          {data.decidio    > 0 && <span style={s.pillGreen}>{data.decidio} decidió</span>}
          <span style={{ ...s.chevron, transform: abierto ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
        </div>
      </div>

      {abierto && (
        <div style={s.escuelasWrap}>
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Escuela profesional</th>
                  <th style={{ textAlign: 'center' }}>Clases</th>
                  <th style={{ textAlign: 'center' }}>Docentes</th>
                  <th style={{ textAlign: 'center' }}>Alumnos</th>
                  <th style={{ textAlign: 'center' }}>
                    <span style={{ color: C_ASD }}>ASD</span>
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    <span style={{ color: C_OTRAS }}>Otras</span>
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    <span style={{ color: C_RECIENTE }}>Recién Baut.</span>
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    <span style={{ color: C_DECIDIO }}>Decidió</span>
                  </th>
                  <th>Docentes asignados</th>
                </tr>
              </thead>
              <tbody>
                {escuelas.map(([escNombre, escData]) => {
                  const docentesList = [...escData.docentes].map(uid => {
                    const u = usuarios.find(u => u.id === uid)
                    return u ? (u.nombreCompleto || u.username) : uid
                  })
                  return (
                    <tr key={escNombre}>
                      <td><div style={s.escNombre}>{escNombre}</div></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={s.pillSlate}>{escData.clases}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={s.pillCyan}>{escData.docentes.size}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={s.pillPurple}>{escData.alumnos}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {escData.bautizados > 0
                          ? <span style={s.pillBlue}>{escData.bautizados}</span>
                          : <span style={s.cero}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {escData.otras > 0
                          ? <span style={s.pillOrange}>{escData.otras}</span>
                          : <span style={s.cero}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {escData.recientes > 0
                          ? <span style={s.pillViolet}>🎉 {escData.recientes}</span>
                          : <span style={s.cero}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {escData.decidio > 0
                          ? <span style={s.pillGreen}>{escData.decidio}</span>
                          : <span style={s.cero}>—</span>}
                      </td>
                      <td>
                        <div style={s.docentesTags}>
                          {docentesList.map((n, i) => (
                            <span key={i} style={s.docenteTag}>{n}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={s.tfootRow}>
                  <td style={s.tfootLabel}>Total facultad</td>
                  <td style={{ textAlign: 'center' }}><span style={s.pillSlate}>{data.clases}</span></td>
                  <td style={{ textAlign: 'center' }}><span style={s.pillCyan}>{data.docentes.size}</span></td>
                  <td style={{ textAlign: 'center' }}><span style={s.pillPurple}>{data.alumnos}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    {data.bautizados > 0 ? <span style={s.pillBlue}>{data.bautizados}</span> : <span style={s.cero}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {data.otras > 0 ? <span style={s.pillOrange}>{data.otras}</span> : <span style={s.cero}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {data.recientes > 0 ? <span style={s.pillViolet}>🎉 {data.recientes}</span> : <span style={s.cero}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {data.decidio > 0 ? <span style={s.pillGreen}>{data.decidio}</span> : <span style={s.cero}>—</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Tarjeta métrica ── */
function MetricaCard({ valor, label, color }) {
  return (
    <div style={{ ...s.metricaCard, borderTop: `3px solid ${color}` }}>
      <div style={{ ...s.metricaValor, color }}>{valor}</div>
      <div style={s.metricaLabel}>{label}</div>
    </div>
  )
}

/* ── Iconos ── */
function IconClases() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IconDocentes() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconAlumnos() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
function IconFacBig() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconCruz() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="6" y1="7" x2="18" y2="7"/></svg>
}
function IconOtras() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}
function IconReciente() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function IconDecidio() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

/* ── Estilos ── */
const pill_ = (bg, color) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 99, fontSize: '0.74rem', fontWeight: 700,
  padding: '0.18rem 0.65rem', background: bg, color,
})

const s = {
  secLabel: {
    fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.09em',
    marginBottom: '0.55rem', marginTop: '0.1rem',
    paddingLeft: '0.1rem',
  },

  globalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '1rem', marginBottom: '1.25rem',
  },

  metricaCard: {
    background: 'white', borderRadius: 16,
    padding: '1.25rem 1.4rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
  },
  metricaIconWrap: {
    width: 42, height: 42, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '0.2rem',
  },
  metricaValor: { fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 },
  metricaLabel: { fontSize: '0.81rem', color: '#64748b', fontWeight: 500, lineHeight: 1.3 },

  chartRow: {
    display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem',
  },
  chartCard:     { flex: '1 1 300px', padding: '1.3rem' },
  chartTitleRow: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    marginBottom: '1rem',
  },
  chartDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#6366f1', flexShrink: 0,
  },
  chartTitle: {
    fontWeight: 700, color: '#1e293b',
    fontSize: '0.92rem', flex: 1,
  },
  chartSubtitle: {
    fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic',
  },
  chartWrap: { height: 230, position: 'relative' },

  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0',
  },

  facBloque: {
    border: '1.5px solid #e2e8f0', borderRadius: 12,
    marginBottom: '0.75rem', overflow: 'hidden',
  },
  facHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.9rem 1rem', background: '#f8fafc',
    cursor: 'pointer', gap: '1rem', flexWrap: 'wrap',
    userSelect: 'none',
  },
  facLeft:   { display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 },
  facDot:    { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  facNombre: { fontWeight: 800, color: '#1e293b', fontSize: '0.97rem' },
  facMeta:   { fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' },
  facRight:  { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  chevron:   { fontSize: '1rem', color: '#94a3b8', transition: 'transform 0.2s', flexShrink: 0 },

  escuelasWrap: { padding: '0 0.5rem 0.5rem' },
  escNombre:    { fontWeight: 600, color: '#1e293b', fontSize: '0.87rem' },
  cero:         { color: '#cbd5e1', fontSize: '0.8rem' },

  tfootRow:  { background: '#f1f5f9' },
  tfootLabel: { color: '#64748b', fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.75rem' },

  /* Pills */
  pill:       pill_('#f1f5f9', '#475569'),
  pillSlate:  pill_('#e2e8f0', '#334155'),
  pillCyan:   pill_('#cffafe', '#0e7490'),
  pillPurple: pill_('#f3e8ff', '#7e22ce'),
  pillBlue:   pill_('#dbeafe', '#1d4ed8'),
  pillOrange: pill_('#fed7aa', '#c2410c'),
  pillViolet: pill_('#ede9fe', '#6d28d9'),
  pillGreen:  pill_('#bbf7d0', '#15803d'),

  docentesTags: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  docenteTag: {
    background: '#f1f5f9', color: '#475569', borderRadius: 99,
    fontSize: '0.73rem', fontWeight: 600, padding: '0.14rem 0.6rem',
    border: '1px solid #e2e8f0',
  },

  facGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem', marginBottom: '1.25rem',
  },
  facChartCard: { padding: '1.1rem 1.2rem 1.2rem' },
  facChartHeader: { paddingLeft: '0.75rem', marginBottom: '0.9rem' },
  facChartTitle: { fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', letterSpacing: '-0.01em' },
  facChartMeta:  { fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: 500 },
}
