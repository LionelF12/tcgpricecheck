import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_FLAG_KEY = 'tcg_admin_bypass'

export interface AuthState {
  session: Session | null
  isAdmin: boolean
  isLoading: boolean
  userId: string | null
}

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<void>
  signInAdmin: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
} {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for admin bypass flag on mount
    SecureStore.getItemAsync(ADMIN_FLAG_KEY).then((val) => {
      if (val === 'true') setIsAdmin(true)
    })

    // Get current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen for auth changes
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
      await SecureStore.setItemAsync(ADMIN_FLAG_KEY, 'true')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const signOut = async () => {
    await SecureStore.deleteItemAsync(ADMIN_FLAG_KEY)
    setIsAdmin(false)
    await supabase.auth.signOut()
  }

  const userId = session?.user?.id ?? (isAdmin ? 'admin-bypass-user' : null)

  return { session, isAdmin, isLoading, userId, signInWithGoogle, signInAdmin, signOut }
}
