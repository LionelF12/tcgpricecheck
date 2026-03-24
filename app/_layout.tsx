import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

export const unstable_settings = {
  anchor: '(app)',
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  )
}

function RootLayoutInner() {
  const { session, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(app)'
    const isAuthenticated = !!session || isAdmin
    const inResultsPage = segments[0] === 'results'

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/')
    } else if (isAuthenticated && !inAuthGroup && !inResultsPage) {
      router.replace('/(app)/search')
    }
  }, [session, isAdmin, isLoading, segments])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
