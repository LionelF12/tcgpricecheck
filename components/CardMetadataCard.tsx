import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import type { CardMetadata } from '@/lib/types'
import { Colors } from '@/constants/colors'

interface CardMetadataCardProps {
  metadata: CardMetadata
  onSave?: () => void
  isSaved?: boolean
}

function GradeTag({ company, grade }: { company: string | null; grade: string | null }) {
  if (!grade) return null
  const color = {
    PSA: Colors.psa,
    BGS: Colors.bgs,
    CGC: Colors.cgc,
    RAW: Colors.raw,
  }[company ?? 'RAW'] ?? Colors.raw

  return (
    <View style={[styles.gradeTag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.gradeTagText, { color }]}>
        {company ? `${company} ${grade}` : grade}
      </Text>
    </View>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

export function CardMetadataCard({ metadata, onSave, isSaved }: CardMetadataCardProps) {
  const categoryLabel = metadata.category === 'riftbound' ? 'Riftbound' : 'Pokémon'

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Card image */}
        <View style={styles.imageWrap}>
          {metadata.imageUrl ? (
            <Image
              source={{ uri: metadata.imageUrl }}
              style={styles.image}
              contentFit="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 40 }}>🃏</Text>
            </View>
          )}
          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
        </View>

        {/* Metadata grid */}
        <View style={styles.metaGrid}>
          <Text style={styles.cardName} numberOfLines={2}>{metadata.name}</Text>
          <GradeTag company={metadata.gradingCompany} grade={metadata.grade} />

          {metadata.set ? <MetaRow label="Set" value={metadata.set} /> : null}
          {metadata.year ? <MetaRow label="Year" value={String(metadata.year)} /> : null}
          {metadata.cardNumber ? <MetaRow label="Card #" value={metadata.cardNumber} /> : null}
          {metadata.slabId ? <MetaRow label="Slab ID" value={metadata.slabId} /> : null}
        </View>
      </View>

      {/* Save button */}
      {onSave && (
        <TouchableOpacity
          style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
          onPress={onSave}
          disabled={isSaved}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextSaved]}>
            {isSaved ? '✓ Saved to Collection' : '+ Save to Collection'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    gap: 14,
  },
  imageWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    width: 100,
    height: 140,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 2,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  categoryText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metaGrid: {
    flex: 1,
    gap: 6,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  gradeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  gradeTagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonSaved: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextSaved: {
    color: Colors.secondary,
  },
})
