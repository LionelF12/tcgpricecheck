import { View, Text, StyleSheet } from 'react-native'
import type { SourcePrices } from '@/lib/types'
import { Colors } from '@/constants/colors'

interface PriceTableProps {
  prices: SourcePrices[]
}

const SOURCE_LABELS: Record<string, string> = {
  alt: 'ALT FMV',
  ebay: 'eBay',
  snkrdunk: 'Snkrdunk',
  cardladder: 'CardLadder',
}

const SOURCE_COLORS: Record<string, string> = {
  alt: Colors.alt,
  ebay: Colors.ebay,
  snkrdunk: Colors.snkrdunk,
  cardladder: Colors.cardladder,
}

function fmt(value: number | null): string {
  if (value === null) return '—'
  return `$${value.toFixed(2)}`
}

const COLUMNS = [
  { key: 'lastSold', label: 'Last Sold' },
  { key: 'avg3Sales', label: 'Avg 3' },
  { key: 'avg5Sales', label: 'Avg 5' },
  { key: 'highest5Sales', label: 'High 5' },
] as const

export function PriceTable({ prices }: PriceTableProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prices (USD)</Text>

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.sourceCell} />
        {COLUMNS.map((col) => (
          <Text key={col.key} style={styles.headerCell}>
            {col.label}
          </Text>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Data rows */}
      {prices.map((src, idx) => (
        <View key={src.source} style={[styles.dataRow, idx < prices.length - 1 && styles.rowBorder]}>
          {/* Source label */}
          <View style={[styles.sourceCell, styles.sourceLabelWrap]}>
            <View style={[styles.sourceDot, { backgroundColor: SOURCE_COLORS[src.source] }]} />
            <Text style={styles.sourceLabel}>{SOURCE_LABELS[src.source] ?? src.source}</Text>
          </View>
          {/* Price columns */}
          {COLUMNS.map((col) => (
            <Text key={col.key} style={styles.dataCell}>
              {fmt(src[col.key])}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  headerCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sourceCell: {
    width: 72,
  },
  sourceLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dataCell: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
})
