import { initializeApp, getApps } from "firebase/app"
import { getDatabase, ref, get, set, onValue, type Database } from "firebase/database"
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type Auth } from "firebase/auth"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyDZ373oF_sQxP7iBRHyrlEzG5BY_eImYu8",
  authDomain: "links-isabelle.firebaseapp.com",
  databaseURL: "https://links-isabelle-default-rtdb.firebaseio.com",
  projectId: "links-isabelle",
  storageBucket: "links-isabelle.firebasestorage.app",
  messagingSenderId: "558227177266",
  appId: "1:558227177266:web:ac4153b44c94595603212b",
  measurementId: "G-TT4JPSCN7Z"
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Analytics (client-side only)
let analytics
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
      console.log("Firebase Analytics initialized")
    }
  })
  console.log("🔥 FIREBASE CONFIG LOADED:", firebaseConfig.projectId)
}

export const database: Database = getDatabase(app)
export const auth: Auth = getAuth(app)

// Database references
export const dataRef = ref(database, "siteData")

// Database operations
export async function fetchSiteData() {
  const snapshot = await get(dataRef)
  return snapshot.val()
}

export function subscribeSiteData(callback: (data: unknown) => void) {
  return onValue(dataRef, (snapshot) => {
    callback(snapshot.val())
  })
}

export async function saveSiteData(data: unknown) {
  await set(dataRef, data)
}

// Auth operations
export async function loginAdmin(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("Login successful", userCredential.user.uid)
    return userCredential
  } catch (error) {
    console.error("Firebase Login Error:", error)
    throw error
  }
}

export async function logoutAdmin() {
  return signOut(auth)
}

export function subscribeAuthState(callback: (user: unknown) => void) {
  return onAuthStateChanged(auth, callback)
}
