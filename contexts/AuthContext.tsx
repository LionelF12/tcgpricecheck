import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Platform } from 'react-native'
import { Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_FLAG_KEY = 'tcg_admin_bypass'

const getFlag = (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return Promise.resolve(null)
    return Promise.resolve(localStorage.getItem(key))
  }
  return SecureStore.getItemAsync(key)
}
const setFlag = (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return Promise.resolve()
  }
  return SecureStore.setItemAsync(key, value)
}
const deleteFlag = (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return Promise.resolve()
  }
  return SecureStore.deleteItemAsync(key)
}

interface AuthContextValue {
  session: Session | null
  isAdmin: boolean
  isLoading: boolean
  userId: string | null
  signInWithGoogle: () => Promise<void>
  signInAdmin: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getFlag(ADMIN_FLAG_KEY).then((val) => {
      if (val === 'true') setIsAdmin(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'tcgpricecheck://auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (error) throw error
  }

  const signInAdmin = async (email: string, password: string): Promise<boolean> => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      await setFlag(ADMIN_FLAG_KEY, 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const signOut = async () => {
    await deleteFlag(ADMIN_FLAG_KEY)
    setIsAdmin(false)
    await supabase.auth.signOut()
  }

  const userId = session?.user?.id ?? (isAdmin ? 'admin-bypass-user' : null)

  return (
    <AuthContext.Provider value={{ session, isAdmin, isLoading, userId, signInWithGoogle, signInAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
