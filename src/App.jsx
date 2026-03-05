import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [sesion, setSesion] = useState(undefined) // undefined = cargando

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid))
        setSesion(snap.exists() ? { uid: user.uid, ...snap.data() } : null)
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
          path="/login"
          element={sesion ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/*"
          element={sesion ? <Dashboard sesion={sesion} /> : <Navigate to="/login" replace />}
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
