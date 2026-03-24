export type CardCategory = 'pokemon' | 'riftbound'
export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'RAW'
export type PriceSource = 'alt' | 'ebay' | 'snkrdunk'
export type PriceType = 'lastSold' | 'avg3Sales' | 'avg5Sales' | 'highest5Sales' | 'manual'

export interface CardMetadata {
  name: string
  set: string
  year: number | null
  cardNumber: string | null
  grade: string | null            // numeric grade e.g. "10", "9.5"
  gradingCompany: GradingCompany | null
  slabId: string | null           // cert / slab number
  category: CardCategory
  imageUrl: string | null
  needsConfirmation: boolean      // true for non-PSA cards (require user confirm)
}

export interface PricePoint {
  date: string   // ISO date string
  price: number  // USD
}

export interface SourcePrices {
  source: PriceSource
  lastSold: number | null
  avg3Sales: number | null
  avg5Sales: number | null
  highest5Sales: number | null
  history: PricePoint[]   // up to 12 months of data points
}

export interface CardResult {
  id: string           // UUID — maps to search history row
  metadata: CardMetadata
  prices: SourcePrices[]
  fetchedAt: string    // ISO timestamp
}

export interface SearchHistoryItem {
  id: string
  card_name: string
  card_image: string | null
  result_data: CardResult
  created_at: string
}

export interface CollectionItem {
  id: string
  card_name: string
  card_image: string | null
  metadata: CardMetadata
  price_snapshot: SourcePrices[] | null
  saved_at: string
}
