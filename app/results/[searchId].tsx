import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { resultCache, collectionCache } from '@/lib/resultCache'
import { useAuth } from '@/hooks/useAuth'
import { useCollection } from '@/hooks/useCollection'
import { CardMetadataCard } from '@/components/CardMetadataCard'
import { PriceChart } from '@/components/PriceChart'
import { PriceTable } from '@/components/PriceTable'
import { Colors } from '@/constants/colors'
import type { CardResult } from '@/lib/types'

export default function ResultsScreen() {
  const { searchId } = useLocalSearchParams<{ searchId: string }>()
  const router = useRouter()
  const { userId } = useAuth()
  const { saveCard, collection } = useCollection(userId)

  const [result, setResult] = useState<CardResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const isSaved = collection.some(
    (item) => item.metadata.name === result?.metadata.name
  )

  useEffect(() => {
    if (!searchId) return
    loadResult()
  }, [searchId])

  const loadResult = async () => {
    setIsLoading(true)
    try {
      // Local (admin bypass) result — load from memory cache
      if (searchId.startsWith('local_')) {
        const cached = resultCache.get(searchId)
        if (cached) setResult(cached)
        return
      }

      // Admin bypass collection item — load from in-memory collectionCache
      if (searchId.startsWith('col_local_')) {
        const item = collectionCache.getAll().find((i) => i.id === searchId)
        if (item) {
          setResult({
            id: searchId,
            metadata: { ...item.metadata, imageUrl: item.card_image ?? item.metadata.imageUrl },
            prices: item.price_snapshot ?? [],
            fetchedAt: item.saved_at,
          })
        }
        return
      }

      if (searchId.startsWith('col_')) {
        // Load from collection table
        const collectionId = searchId.replace('col_', '')
        const { data, error } = await supabase
          .from('mobile_collection')
          .select('metadata, price_snapshot, card_image, saved_at')
          .eq('id', collectionId)
          .single()
        if (error) throw error
        if (data) {
          const collectionResult: CardResult = {
            id: searchId,
            metadata: { ...data.metadata, imageUrl: data.card_image ?? data.metadata.imageUrl },
            prices: data.price_snapshot ?? [],
            fetchedAt: data.saved_at,
          }
          setResult(collectionResult)
        }
      } else {
        // Load from search history
        const { data, error } = await supabase
          .from('mobile_search_history')
          .select('result_data')
          .eq('id', searchId)
          .single()
        if (error) throw error
        if (data?.result_data) {
          setResult({ ...(data.result_data as CardResult), id: searchId })
        }
      }
    } catch (err: any) {
      Alert.alert('Error', 'Could not load card result.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result || !userId) return
    setIsSaving(true)
    try {
      await saveCard(
        result.metadata.name,
        result.metadata.imageUrl,
        result.metadata,
        result.prices
      )
      Alert.alert('Saved!', `${result.metadata.name} has been added to your collection.`)
    } catch (err: any) {
      Alert.alert('Save Error', err.message ?? 'Could not save card.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading result…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Result not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {result.metadata.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Card metadata + save button */}
        <CardMetadataCard
          metadata={result.metadata}
          onSave={isSaving ? undefined : handleSave}
          isSaved={isSaved}
        />

        {/* Price history chart */}
        {result.prices.length > 0 && (
          <PriceChart prices={result.prices} />
        )}

        {/* Price comparison table */}
        {result.prices.length > 0 && (
          <PriceTable prices={result.prices} />
        )}

        {/* Fetched timestamp */}
        <Text style={styles.timestamp}>
          Prices fetched {new Date(result.fetchedAt).toLocaleDateString()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: '300',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  errorText: { fontSize: 15, color: Colors.error },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: { fontSize: 14, color: Colors.textPrimary },
  timestamp: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
