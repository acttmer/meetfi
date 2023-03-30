import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDNbnY0TWa2tvH3ker9JXkDjnEdRqwV-Mw',
  authDomain: 'meetfi-app.firebaseapp.com',
  projectId: 'meetfi-app',
  storageBucket: 'meetfi-app.appspot.com',
  messagingSenderId: '354791996089',
  appId: '1:354791996089:web:875850786896aa04343968',
}

export const app = initializeApp(firebaseConfig)
export const firestore = getFirestore(app)
