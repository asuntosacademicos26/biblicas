import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { ref, get } from 'firebase/database'
import { auth, db } from './firebase'
import Landing from './pages/Landing'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [sesion, setSesion] = useState(undefined) // undefined = cargando

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (user) {
        const snap = await get(ref(db, `usuarios/${user.uid}`))
        setSesion(snap.exists() ? { uid: user.uid, ...snap.val() } : null)
      } else {
        setSesion(null)
      }
    })
    return unsub
  }, [])

  if (sesion === undefined) return <Cargando />

  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route
          path="/*"
          element={sesion ? <Dashboard sesion={sesion} /> : <Landing />}
        />
      </Routes>
    </HashRouter>
  )
}

function Cargando() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#718096' }}>
      Cargando…
    </div>
  )
}
