import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LineChart } from 'react-native-chart-kit'
import type { SourcePrices } from '@/lib/types'
import { Colors } from '@/constants/colors'

const SCREEN_WIDTH = Dimensions.get('window').width
const CHART_WIDTH = SCREEN_WIDTH - 48 // account for padding

type TimeRange = '3M' | '6M' | '12M'

const SOURCE_COLORS: Record<string, string> = {
  alt: Colors.alt,
  ebay: Colors.ebay,
  snkrdunk: Colors.snkrdunk,
  cardladder: Colors.cardladder,
}

interface PriceChartProps {
  prices: SourcePrices[]
}

function filterByRange(history: { date: string; price: number }[], range: TimeRange) {
  const now = new Date()
  const cutoff = new Date()
  if (range === '3M') cutoff.setMonth(now.getMonth() - 3)
  else if (range === '6M') cutoff.setMonth(now.getMonth() - 6)
  else cutoff.setFullYear(now.getFullYear() - 1)

  return history.filter((p) => new Date(p.date) >= cutoff)
}

export function PriceChart({ prices }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>('3M')

  const ranges: TimeRange[] = ['3M', '6M', '12M']

  // Only show sources that have actual history data
  const sourcesWithHistory = prices.filter(p => p.history.length >= 2)

  if (sourcesWithHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Price History</Text>
        <Text style={styles.emptyText}>
          No sales history available yet.{'\n'}
          Will populate once CardLadder credentials are configured or eBay API is connected.
        </Text>
      </View>
    )
  }

  // Use cardladder as primary if available, then ebay, then first with data
  const primarySource =
    sourcesWithHistory.find(p => p.source === 'cardladder') ??
    sourcesWithHistory.find(p => p.source === 'ebay') ??
    sourcesWithHistory[0]

  const primaryFiltered = filterByRange(primarySource.history, range)
  if (primaryFiltered.length < 2) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Price History</Text>
        <Text style={styles.emptyText}>No sales in the selected time range.</Text>
      </View>
    )
  }

  // Downsample to at most 12 points for readability
  const step = Math.max(1, Math.floor(primaryFiltered.length / 12))
  const sampled = primaryFiltered.filter((_, i) => i % step === 0)

  const labels = sampled.map((p) => {
    const d = new Date(p.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Build datasets only for sources that have history in this range
  const datasets = sourcesWithHistory.map((src) => {
    const srcFiltered = filterByRange(src.history, range)
    const srcSampled = srcFiltered.filter((_, i) => i % step === 0)
    const data = sampled.map((primary) => {
      const match = srcSampled.find((s) => s.date === primary.date)
      return match?.price ?? primary.price
    })
    return {
      data,
      color: () => SOURCE_COLORS[src.source] ?? Colors.primary,
      strokeWidth: 2,
    }
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Price History (USD)</Text>
        <View style={styles.toggleRow}>
          {ranges.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.toggleBtn, range === r && styles.toggleBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.toggleText, range === r && styles.toggleTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Legend — only sources with history */}
      <View style={styles.legend}>
        {sourcesWithHistory.map((src) => (
          <View key={src.source} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SOURCE_COLORS[src.source] }]} />
            <Text style={styles.legendLabel}>{src.source.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <LineChart
        data={{ labels, datasets }}
        width={CHART_WIDTH}
        height={180}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(93, 167, 219, ${opacity})`,
          labelColor: () => Colors.textMuted,
          style: { borderRadius: 8 },
          propsForDots: { r: '0' },
          propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '4 4' },
        }}
        bezier
        style={{ borderRadius: 8, marginLeft: -12 }}
        withDots={false}
        withShadow={false}
        fromZero={false}
        formatYLabel={(v) => `$${Math.round(Number(v))}`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
})
