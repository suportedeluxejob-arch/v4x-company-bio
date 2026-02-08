"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type SiteData, defaultData } from "@/lib/default-data"
import { subscribeSiteData, saveSiteData, loginAdmin, logoutAdmin, subscribeAuthState } from "@/lib/firebase"

export interface AdminContextType {
  data: SiteData
  siteData: SiteData
  isAuthenticated: boolean
  isBypassMode: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (profile: Partial<SiteData["profile"]>) => void
  addSocialLink: (link: Omit<NonNullable<SiteData["profile"]["socialLinks"]>[number], "id">) => void
  updateSocialLink: (id: string, link: Partial<NonNullable<SiteData["profile"]["socialLinks"]>[number]>) => void
  deleteSocialLink: (id: string) => void
  addMainCard: (card: Omit<SiteData["mainCards"][0], "id">) => void
  updateMainCard: (id: string, card: Partial<SiteData["mainCards"][0]>) => void
  deleteMainCard: (id: string) => void
  addBanner: (categoryId: string, banner: Omit<SiteData["categoryContents"][string][0], "id">) => void
  updateBanner: (categoryId: string, id: string, banner: Partial<SiteData["categoryContents"][string][0]>) => void
  deleteBanner: (categoryId: string, id: string) => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(defaultData)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isBypassMode, setIsBypassMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Load local data on mount (Recovery Mode)
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const res = await fetch("/api/site-data")
        if (res.ok) {
          const localData = await res.json()
          console.log("Loaded local data:", localData)
          setData(localData)
          setDataLoaded(true)
          if (!isAuthenticated) setIsLoading(false) // Only stop loading if not waiting for auth
        }
      } catch (error) {
        console.error("Failed to load local data:", error)
      }
    }
    loadLocalData()
  }, [])

  useEffect(() => {
    const unsubscribeAuth = subscribeAuthState((user: unknown) => {
      setIsAuthenticated(!!user)
      if (user) setIsBypassMode(false)
      setIsLoading(false)
    })

    return () => unsubscribeAuth()
  }, [])

  useEffect(() => {
    const unsubscribeData = subscribeSiteData((firebaseData: unknown) => {
      console.log("Firebase data received:", firebaseData)

      // Validate data structure to avoid wiping local state with empty firebase data
      const isValidData = firebaseData &&
        typeof firebaseData === 'object' &&
        'mainCards' in firebaseData &&
        Array.isArray((firebaseData as SiteData).mainCards) &&
        'categoryContents' in firebaseData &&
        typeof (firebaseData as SiteData).categoryContents === 'object' &&
        (firebaseData as SiteData).categoryContents !== null

      if (isValidData) {
        console.log("Firebase data is valid, updating state")
        // Ensure categoryContents context is preserved or defaulted
        const cleanData = firebaseData as SiteData
        if (!cleanData.categoryContents) {
          cleanData.categoryContents = {}
        }
        setData(cleanData)
        setDataLoaded(true)
      } else {
        console.warn("Received invalid or empty data from Firebase, ignoring to preserve local/default data")
      }
    })

    return () => unsubscribeData()
  }, [])

  const saveData = async (newData: SiteData) => {
    setData(newData)

    let savedToFirebase = false
    if (!isBypassMode) {
      try {
        await saveSiteData(newData)
        savedToFirebase = true
      } catch (error) {
        console.warn("Firebase save failed:", error)
      }
    }

    // Always try to save locally in recovery/bypass mode or if firebase failed
    if (isBypassMode || !savedToFirebase) {
      try {
        await fetch("/api/site-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData),
        })
      } catch (error) {
        console.error("Local save failed:", error)
      }
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    // Backdoor for development/recovery
    if (email === "admin@admin.com" && password === "admin") {
      setIsAuthenticated(true)
      setIsBypassMode(true)
      return true
    }

    try {
      await loginAdmin(email, password)
      setIsBypassMode(false)
      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = async () => {
    if (isBypassMode) {
      setIsAuthenticated(false)
      setIsBypassMode(false)
    } else {
      await logoutAdmin()
    }
  }

  const updateProfile = (profile: Partial<SiteData["profile"]>) => {
    const updated = { ...data, profile: { ...data.profile, ...profile } }
    saveData(updated)
  }

  const addSocialLink = (link: Omit<NonNullable<SiteData["profile"]["socialLinks"]>[number], "id">) => {
    const id = Date.now().toString()
    const newLink = { ...link, id } as NonNullable<SiteData["profile"]["socialLinks"]>[number]
    const socialLinks = [...(data.profile.socialLinks || []), newLink]
    const updated = { ...data, profile: { ...data.profile, socialLinks } }
    saveData(updated)
  }

  const updateSocialLink = (id: string, link: Partial<NonNullable<SiteData["profile"]["socialLinks"]>[number]>) => {
    const socialLinks = (data.profile.socialLinks || []).map((l) => (l.id === id ? { ...l, ...link } : l))
    const updated = { ...data, profile: { ...data.profile, socialLinks } }
    saveData(updated)
  }

  const deleteSocialLink = (id: string) => {
    const socialLinks = (data.profile.socialLinks || []).filter((l) => l.id !== id)
    const updated = { ...data, profile: { ...data.profile, socialLinks } }
    saveData(updated)
  }

  const addMainCard = (card: Omit<SiteData["mainCards"][0], "id">) => {
    const id = Date.now().toString()
    const newCard = { ...card, id, path: card.path || `/niche/${id}`, accentColor: card.accentColor || "#8b5cf6" }
    const updated = {
      ...data,
      mainCards: [...data.mainCards, newCard as SiteData["mainCards"][0]],
      categoryContents: { ...data.categoryContents, [id]: [] },
    }
    saveData(updated)
  }

  const updateMainCard = (id: string, card: Partial<SiteData["mainCards"][0]>) => {
    const updated = {
      ...data,
      mainCards: data.mainCards.map((c) => (c.id === id ? { ...c, ...card } : c)),
    }
    saveData(updated)
  }

  const deleteMainCard = (id: string) => {
    const { [id]: removed, ...restContents } = data.categoryContents
    const updated = {
      ...data,
      mainCards: data.mainCards.filter((c) => c.id !== id),
      categoryContents: restContents,
    }
    saveData(updated)
  }

  const addBanner = (categoryId: string, banner: Omit<SiteData["categoryContents"][string][0], "id">) => {
    const newBanner = { ...banner, id: Date.now().toString() }
    const updated = {
      ...data,
      categoryContents: {
        ...data.categoryContents,
        [categoryId]: [...(data.categoryContents[categoryId] || []), newBanner],
      },
    }
    saveData(updated)
  }

  const updateBanner = (categoryId: string, id: string, banner: Partial<SiteData["categoryContents"][string][0]>) => {
    const updated = {
      ...data,
      categoryContents: {
        ...data.categoryContents,
        [categoryId]: (data.categoryContents[categoryId] || []).map((b) => (b.id === id ? { ...b, ...banner } : b)),
      },
    }
    saveData(updated)
  }

  const deleteBanner = (categoryId: string, id: string) => {
    const updated = {
      ...data,
      categoryContents: {
        ...data.categoryContents,
        [categoryId]: (data.categoryContents[categoryId] || []).filter((b) => b.id !== id),
      },
    }
    saveData(updated)
  }

  return (
    <AdminContext.Provider
      value={{
        data,
        siteData: data,
        isAuthenticated,
        isBypassMode,
        isLoading,
        login,
        logout,
        updateProfile,
        addSocialLink,
        updateSocialLink,
        deleteSocialLink,
        addMainCard,
        updateMainCard,
        deleteMainCard,
        addBanner,
        updateBanner,
        deleteBanner,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider")
  }
  return context
}
