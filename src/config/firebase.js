import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            'AIzaSyDVWI0jkQCxWodyFqH6rXeoi5tWwL00img',
  authDomain:        'asuntos-academicos.firebaseapp.com',
  projectId:         'asuntos-academicos',
  storageBucket:     'asuntos-academicos.firebasestorage.app',
  messagingSenderId: '278121373859',
  appId:             '1:278121373859:web:dc6b90481bbe81eb0cdf16',
  databaseURL:       'https://asuntos-academicos-default-rtdb.firebaseio.com',
}

export const app             = initializeApp(firebaseConfig)
export const auth            = getAuth(app)
export const db              = getDatabase(app)
export const storage         = getStorage(app)
export const firebaseConfig2 = firebaseConfig

// Dominio interno para convertir username → email en Firebase Auth
export const DOMINIO = '@asuntos.app'
