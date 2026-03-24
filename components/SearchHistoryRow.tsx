import { FlatList, TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import type { SearchHistoryItem } from '@/lib/types'
import { Colors } from '@/constants/colors'

interface SearchHistoryRowProps {
  items: SearchHistoryItem[]
  onPress: (item: SearchHistoryItem) => void
}

export function SearchHistoryRow({ items, onPress }: SearchHistoryRowProps) {
  if (items.length === 0) return null

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>Recent Searches</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chip} onPress={() => onPress(item)} activeOpacity={0.8}>
            {item.card_image ? (
              <Image
                source={{ uri: item.card_image }}
                style={styles.chipImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.chipImagePlaceholder}>
                <Text style={{ fontSize: 16 }}>🃏</Text>
              </View>
            )}
            <Text style={styles.chipText} numberOfLines={2}>
              {item.card_name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  chipImage: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  chipImagePlaceholder: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
})
