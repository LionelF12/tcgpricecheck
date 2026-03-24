import { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import type { CollectionItem, PriceSource, PriceType } from '@/lib/types'
import { getExchangeRate } from '@/lib/edge-functions'
import { Colors } from '@/constants/colors'

interface QuickFormatModalProps {
  item: CollectionItem | null
  visible: boolean
  onClose: () => void
}

const SOURCES: { key: PriceSource; label: string }[] = [
  { key: 'alt', label: 'ALT' },
  { key: 'ebay', label: 'eBay' },
  { key: 'snkrdunk', label: 'Snkrdunk' },
]

const PRICE_TYPES: { key: PriceType; label: string }[] = [
  { key: 'lastSold', label: 'Last Sold' },
  { key: 'avg3Sales', label: 'Avg 3 Sales' },
  { key: 'avg5Sales', label: 'Avg 5 Sales' },
  { key: 'manual', label: 'Manual Entry' },
]

export function QuickFormatModal({ item, visible, onClose }: QuickFormatModalProps) {
  const [selectedSource, setSelectedSource] = useState<PriceSource>('ebay')
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>('lastSold')
  const [manualPrice, setManualPrice] = useState('')
  const [exchangeRate, setExchangeRate] = useState(1.35)
  const [loadingRate, setLoadingRate] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadExchangeRate()
      setIsCopied(false)
    }
  }, [visible])

  const loadExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const rate = await getExchangeRate()
      setExchangeRate(rate)
    } catch {
      // Use fallback rate silently
    } finally {
      setLoadingRate(false)
    }
  }

  const getUsdPrice = (): number | null => {
    if (!item?.price_snapshot) return null
    if (selectedPriceType === 'manual') {
      const n = parseFloat(manualPrice)
      return isNaN(n) ? null : n
    }
    const src = item.price_snapshot.find((p) => p.source === selectedSource)
    if (!src) return null
    return src[selectedPriceType] ?? null
  }

  const sgdPrice = (() => {
    const usd = getUsdPrice()
    if (usd === null) return null
    return Math.ceil(usd * exchangeRate)
  })()

  const formatText = (() => {
    if (!item) return ''
    const meta = item.metadata
    const year = meta.year ?? '—'
    const name = meta.name
    const cardNum = meta.cardNumber ?? '—'
    const grade = meta.grade
      ? `${meta.gradingCompany ?? ''} ${meta.grade}`.trim()
      : 'Ungraded'
    const price = sgdPrice !== null ? `$${sgdPrice}` : '[price TBD]'

    return `WTS ${year}, ${name}, ${cardNum}, ${grade}, for ${price} SGD. For more details feel free to contact XXX.`
  })()

  const handleCopy = async () => {
    await Clipboard.setStringAsync(formatText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  const handleDownloadImage = async () => {
    if (!item?.card_image) {
      Alert.alert('No image', 'This card has no saved image.')
      return
    }
    setIsDownloading(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo library access to save images.')
        return
      }

      // Download to temp file first, then save to media library
      const fileName = `card_${item.id}.jpg`
      const localUri = FileSystem.documentDirectory + fileName
      await FileSystem.downloadAsync(item.card_image, localUri)
      await MediaLibrary.saveToLibraryAsync(localUri)
      await FileSystem.deleteAsync(localUri, { idempotent: true })

      Alert.alert('Saved!', 'Card image saved to your photo library.')
    } catch (err: any) {
      Alert.alert('Download Error', err.message ?? 'Failed to save image.')
    } finally {
      setIsDownloading(false)
    }
  }

  if (!item) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Quick Format</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Source picker */}
            <Text style={styles.sectionLabel}>Price Source</Text>
            <View style={styles.segmentRow}>
              {SOURCES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.segment, selectedSource === s.key && styles.segmentActive]}
                  onPress={() => setSelectedSource(s.key)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selectedSource === s.key && styles.segmentTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price type picker */}
            <Text style={styles.sectionLabel}>Price Type</Text>
            <View style={styles.priceTypeGrid}>
              {PRICE_TYPES.map((pt) => (
                <TouchableOpacity
                  key={pt.key}
                  style={[styles.priceTypeBtn, selectedPriceType === pt.key && styles.priceTypeBtnActive]}
                  onPress={() => setSelectedPriceType(pt.key)}
                >
                  <Text
                    style={[
                      styles.priceTypeText,
                      selectedPriceType === pt.key && styles.priceTypeTextActive,
                    ]}
                  >
                    {pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Manual price input */}
            {selectedPriceType === 'manual' && (
              <View style={styles.manualRow}>
                <Text style={styles.manualLabel}>USD Price</Text>
                <TextInput
                  style={styles.manualInput}
                  value={manualPrice}
                  onChangeText={setManualPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 45.00"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            )}

            {/* Exchange rate info */}
            <View style={styles.rateRow}>
              <Text style={styles.rateText}>
                {loadingRate ? 'Loading rate…' : `Rate: 1 USD = ${exchangeRate.toFixed(4)} SGD`}
              </Text>
              {loadingRate && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            {/* Price preview */}
            {sgdPrice !== null && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewLabel}>Price (SGD)</Text>
                <Text style={styles.pricePreviewValue}>${sgdPrice} SGD</Text>
              </View>
            )}

            {/* Format text box */}
            <Text style={styles.sectionLabel}>Generated Text</Text>
            <View style={styles.textBox}>
              <Text style={styles.formatText}>{formatText}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.copyBtn, isCopied && styles.copyBtnDone]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Text style={styles.copyBtnText}>{isCopied ? '✓ Copied!' : 'Copy Text'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.downloadBtn]}
                onPress={handleDownloadImage}
                disabled={isDownloading || !item.card_image}
                activeOpacity={0.8}
              >
                {isDownloading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.downloadBtnText}>Save Image</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  priceTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  priceTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '22',
  },
  priceTypeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceTypeTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  manualRow: {
    marginTop: 12,
    gap: 6,
  },
  manualLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  manualInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  rateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  pricePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.secondary + '44',
  },
  pricePreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  pricePreviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  textBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  formatText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyBtn: {
    backgroundColor: Colors.primary,
  },
  copyBtnDone: {
    backgroundColor: Colors.secondary,
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  downloadBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  downloadBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
})
