import { initializeApp, getApps } from "firebase/app"
import { getDatabase, ref, get, set, onValue, type Database } from "firebase/database"
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type Auth } from "firebase/auth"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBzE5itaWFIbuE1GEA4ArBxkK3iQf07JhE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "v4x-company.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://v4x-company-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "v4x-company",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "v4x-company.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "817773676750",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:817773676750:web:05f735bdd6fde8b15ea89f",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-BVSCPR3VQK"
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
