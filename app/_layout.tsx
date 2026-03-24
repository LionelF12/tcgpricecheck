import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '@/hooks/useAuth'

export const unstable_settings = {
  anchor: '(app)',
}

export default function RootLayout() {
  const { session, isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(app)'
    const isAuthenticated = !!session || isAdmin

    // Allow results page to be accessed regardless of auth state (for collection viewing)
    const inResultsPage = segments[0] === 'results'
    if (!isAuthenticated && inAuthGroup) {
      // Not logged in but trying to access the app — redirect to login
      router.replace('/')
    } else if (isAuthenticated && !inAuthGroup && !inResultsPage) {
      // Logged in but on the login screen — redirect to app
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
