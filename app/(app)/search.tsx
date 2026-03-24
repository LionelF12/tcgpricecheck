import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useRouter } from 'expo-router'
import { SearchBar } from '@/components/SearchBar'
import { CameraButton } from '@/components/CameraButton'
import { UploadButton } from '@/components/UploadButton'
import { SearchHistoryRow } from '@/components/SearchHistoryRow'
import { identifyCard, getPrices, psaLookup } from '@/lib/edge-functions'
import { useAuth } from '@/hooks/useAuth'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { Colors } from '@/constants/colors'
import type { CardMetadata, CardResult } from '@/lib/types'

type SearchState = 'idle' | 'identifying' | 'confirming' | 'fetching_prices' | 'saving'

export default function SearchScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const { history, addSearch } = useSearchHistory(userId)

  const [searchText, setSearchText] = useState('')
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [pendingMetadata, setPendingMetadata] = useState<CardMetadata | null>(null)
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null)

  const isLoading = searchState !== 'idle' && searchState !== 'confirming'

  // ─── TEXT SEARCH ───────────────────────────────────────────────
  const handleTextSearch = useCallback(async () => {
    if (!searchText.trim()) return
    try {
      setSearchState('fetching_prices')
      const fakeMeta: CardMetadata = {
        name: searchText.trim(),
        set: '',
        year: null,
        cardNumber: null,
        grade: null,
        gradingCompany: null,
        slabId: null,
        category: 'pokemon',
        imageUrl: null,
        needsConfirmation: false,
      }
      await runPricesAndSave(fakeMeta, null)
    } catch (err: any) {
      Alert.alert('Search Error', err.message ?? 'Something went wrong.')
      setSearchState('idle')
    }
  }, [searchText])

  // ─── CAMERA ────────────────────────────────────────────────────
  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to photograph cards.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64 ?? null)
    }
  }, [])

  // ─── UPLOAD ────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to upload card images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
      base64: true,
    })
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri, result.assets[0].base64 ?? null)
    }
  }, [])

  // ─── IMAGE PROCESSING FLOW ─────────────────────────────────────
  const processImage = async (uri: string, base64: string | null) => {
    if (!base64) {
      // Fallback: read as base64 from file system
      const fileBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      base64 = fileBase64
    }
    setCapturedImageUri(uri)

    try {
      setSearchState('identifying')
      const metadata = await identifyCard(base64)

      if (metadata.gradingCompany === 'PSA' && metadata.slabId) {
        // PSA card: auto-lookup the cert for verified metadata
        const psaMeta = await psaLookup(metadata.slabId)
        const mergedMeta: CardMetadata = { ...metadata, ...psaMeta, needsConfirmation: false }
        await runPricesAndSave(mergedMeta, uri)
      } else {
        // Non-PSA: ask user to confirm identification
        setPendingMetadata(metadata)
        setSearchState('confirming')
      }
    } catch (err: any) {
      Alert.alert('Identification Error', err.message ?? 'Could not identify card.')
      setSearchState('idle')
      setCapturedImageUri(null)
    }
  }

  const handleConfirm = async () => {
    if (!pendingMetadata) return
    await runPricesAndSave(pendingMetadata, capturedImageUri)
  }

  const handleReject = () => {
    setPendingMetadata(null)
    setCapturedImageUri(null)
    setSearchState('idle')
  }

  // ─── PRICES + SAVE ─────────────────────────────────────────────
  const runPricesAndSave = async (metadata: CardMetadata, imageUri: string | null) => {
    try {
      setSearchState('fetching_prices')
      const prices = await getPrices(metadata.name, metadata.set, metadata.grade)

      const result: CardResult = {
        id: '',
        metadata,
        prices,
        fetchedAt: new Date().toISOString(),
      }

      setSearchState('saving')
      const savedId = await addSearch(metadata.name, imageUri, result)

      router.push(`/results/${savedId}`)
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to fetch prices.')
    } finally {
      setSearchState('idle')
      setPendingMetadata(null)
      setCapturedImageUri(null)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TCG Price Check</Text>
          <Text style={styles.headerSubtitle}>Search or scan a card to get prices</Text>
        </View>

        {/* Search bar */}
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          onSubmit={handleTextSearch}
          isLoading={isLoading}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or scan a card</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Camera + Upload buttons */}
        <View style={styles.iconRow}>
          <CameraButton onPress={handleCamera} disabled={isLoading} />
          <UploadButton onPress={handleUpload} disabled={isLoading} />
        </View>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>
              {searchState === 'identifying' && 'Identifying card with AI…'}
              {searchState === 'fetching_prices' && 'Fetching prices from Alt, eBay & Snkrdunk…'}
              {searchState === 'saving' && 'Saving result…'}
            </Text>
          </View>
        )}

        {/* Search history */}
        <SearchHistoryRow
          items={history}
          onPress={(item) => router.push(`/results/${item.id}`)}
        />
      </ScrollView>

      {/* Confirmation modal for non-PSA cards */}
      <Modal
        visible={searchState === 'confirming' && !!pendingMetadata}
        transparent
        animationType="slide"
        onRequestClose={handleReject}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Is this the right card?</Text>
            <Text style={styles.confirmSubtitle}>
              AI identified this card. Please confirm before fetching prices.
            </Text>

            {capturedImageUri && (
              <Image
                source={{ uri: capturedImageUri }}
                style={styles.confirmImage}
                resizeMode="contain"
              />
            )}

            {pendingMetadata && (
              <View style={styles.confirmMeta}>
                <ConfirmRow label="Name" value={pendingMetadata.name} />
                <ConfirmRow label="Set" value={pendingMetadata.set || '—'} />
                <ConfirmRow label="Year" value={pendingMetadata.year?.toString() ?? '—'} />
                <ConfirmRow label="Card #" value={pendingMetadata.cardNumber ?? '—'} />
                {pendingMetadata.grade && (
                  <ConfirmRow
                    label="Grade"
                    value={`${pendingMetadata.gradingCompany ?? ''} ${pendingMetadata.grade}`}
                  />
                )}
              </View>
            )}

            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Text style={styles.rejectBtnText}>Not right</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmBtnText}>Yes, fetch prices</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  header: { gap: 4, paddingTop: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },
  iconRow: { flexDirection: 'row', gap: 12 },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  // Confirmation modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  confirmCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  confirmSubtitle: { fontSize: 13, color: Colors.textMuted },
  confirmImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
  },
  confirmMeta: { gap: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmLabel: { fontSize: 14, color: Colors.textSecondary },
  confirmValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  confirmButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rejectBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
})
