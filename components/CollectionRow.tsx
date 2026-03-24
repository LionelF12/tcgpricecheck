import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import type { CollectionItem } from '@/lib/types'
import { Colors } from '@/constants/colors'

interface CollectionRowProps {
  item: CollectionItem
  onPress: () => void
  onQuickFormat: () => void
  onRemove: () => void
}

export function CollectionRow({ item, onPress, onQuickFormat, onRemove }: CollectionRowProps) {
  const meta = item.metadata
  const gradeLabel = meta.grade
    ? `${meta.gradingCompany ?? ''} ${meta.grade}`.trim()
    : 'Raw'

  const savedDate = new Date(item.saved_at).toLocaleDateString('en-SG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {/* Card image */}
      {item.card_image ? (
        <Image
          source={{ uri: item.card_image }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 24 }}>🃏</Text>
        </View>
      )}

      {/* Card info */}
      <View style={styles.info}>
        <Text style={styles.cardName} numberOfLines={2}>{meta.name}</Text>
        <View style={styles.tagsRow}>
          <View style={styles.gradeTag}>
            <Text style={styles.gradeTagText}>{gradeLabel}</Text>
          </View>
          {meta.year && (
            <Text style={styles.yearText}>{meta.year}</Text>
          )}
        </View>
        <Text style={styles.dateText}>Saved {savedDate}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={styles.quickFormatBtn}
          onPress={onQuickFormat}
          activeOpacity={0.7}
        >
          <Text style={styles.quickFormatIcon}>📋</Text>
          <Text style={styles.quickFormatText}>Format</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <Text style={styles.removeIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 56,
    height: 78,
    borderRadius: 6,
  },
  imagePlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeTag: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
  },
  gradeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  yearText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  actionColumn: {
    gap: 6,
    alignItems: 'center',
  },
  quickFormatBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 60,
  },
  quickFormatIcon: {
    fontSize: 18,
  },
  quickFormatText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.error + '55',
    minWidth: 60,
  },
  removeIcon: {
    fontSize: 16,
  },
})
