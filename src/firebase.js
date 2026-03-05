import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey:            'AIzaSyBhLJ98cyEJPde_wJ1dIXkntkCaa7RLcSI',
  authDomain:        'asuntos-7537d.firebaseapp.com',
  projectId:         'asuntos-7537d',
  storageBucket:     'asuntos-7537d.firebasestorage.app',
  messagingSenderId: '271877814458',
  appId:             '1:271877814458:web:21e5ca5d7328a6b15caa83',
  databaseURL:       'https://asuntos-7537d-default-rtdb.firebaseio.com',
}

export const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getDatabase(app)
export const firebaseConfig2 = firebaseConfig

// Dominio interno para convertir username → email en Firebase Auth
export const DOMINIO = '@asuntos.app'
