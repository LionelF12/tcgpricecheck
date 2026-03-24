import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useCollection } from '@/hooks/useCollection'
import { CollectionRow } from '@/components/CollectionRow'
import { QuickFormatModal } from '@/components/QuickFormatModal'
import { Colors } from '@/constants/colors'
import type { CollectionItem } from '@/lib/types'

export default function CollectionScreen() {
  const router = useRouter()
  const { userId } = useAuth()
  const { collection, isLoading, refetch } = useCollection(userId)
  const [quickFormatItem, setQuickFormatItem] = useState<CollectionItem | null>(null)

  const handleRowPress = (item: CollectionItem) => {
    // Navigate to results page using stored result data
    // We use the collection item's id to fetch via supabase
    // The results page can also accept collection items directly
    router.push(`/results/col_${item.id}`)
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Collection</Text>
        <Text style={styles.headerSubtitle}>
          {collection.length} {collection.length === 1 ? 'card' : 'cards'} saved
        </Text>
      </View>

      {collection.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyText}>
            Search for a card and tap "Save to Collection" to add it here.
          </Text>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push('/(app)/search')}
          >
            <Text style={styles.searchBtnText}>Search Cards</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={collection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <CollectionRow
              item={item}
              onPress={() => handleRowPress(item)}
              onQuickFormat={() => setQuickFormatItem(item)}
            />
          )}
        />
      )}

      <QuickFormatModal
        item={quickFormatItem}
        visible={!!quickFormatItem}
        onClose={() => setQuickFormatItem(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  searchBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})
