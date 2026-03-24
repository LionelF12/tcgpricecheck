import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Colors } from '@/constants/colors'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const { signInAdmin } = useAuth()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminEmail, setAdminEmail] = useState('admin@test.com')
  const [adminPassword, setAdminPassword] = useState('admin123')
  const [adminLoading, setAdminLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'tcgpricecheck://auth/callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (!data.url) throw new Error('No OAuth URL returned')

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'tcgpricecheck://auth/callback'
      )

      if (result.type === 'success') {
        const urlString = result.url
        const hashPart = urlString.includes('#') ? urlString.split('#')[1] : urlString.split('?')[1]
        const params = new URLSearchParams(hashPart || '')
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
      }
    } catch (err: any) {
      Alert.alert('Login Error', err.message ?? 'Failed to sign in with Google.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleAdminLogin = async () => {
    setAdminLoading(true)
    const ok = await signInAdmin(adminEmail, adminPassword)
    setAdminLoading(false)
    if (!ok) {
      Alert.alert('Invalid credentials', 'Check your admin email and password.')
    } else {
      setShowAdminModal(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo / header area */}
      <View style={styles.heroSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>🃏</Text>
        </View>
        <Text style={styles.title}>TCG Price Check</Text>
        <Text style={styles.subtitle}>
          Scan any Pokemon or Riftbound card and get{'\n'}real-time prices from Alt, eBay & Snkrdunk.
        </Text>
      </View>

      {/* Auth buttons */}
      <View style={styles.authSection}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading}
          activeOpacity={0.85}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => setShowAdminModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.adminButtonText}>Admin Login</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>

      {/* Admin bypass modal */}
      <Modal
        visible={showAdminModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Admin Login</Text>
            <Text style={styles.modalSubtitle}>Testing bypass — not for production use.</Text>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="admin@test.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="admin123"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowAdminModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleAdminLogin}
                disabled={adminLoading}
              >
                {adminLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  authSection: {
    gap: 12,
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 56,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  adminButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 56,
  },
  adminButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  footer: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
})
