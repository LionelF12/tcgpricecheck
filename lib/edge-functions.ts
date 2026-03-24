import { supabase } from './supabase'
import type { CardMetadata, SourcePrices } from './types'

/** Send a base64 image to Claude Vision for card identification */
export async function identifyCard(base64Image: string): Promise<CardMetadata> {
  const { data, error } = await supabase.functions.invoke('identify-card', {
    body: { image: base64Image },
  })
  if (error) throw new Error(`identify-card failed: ${error.message}`)
  return data as CardMetadata
}

/** Fetch prices for a card from all three sources */
export async function getPrices(
  cardName: string,
  set: string,
  grade: string | null
): Promise<SourcePrices[]> {
  const { data, error } = await supabase.functions.invoke('get-prices', {
    body: { cardName, set, grade },
  })
  if (error) throw new Error(`get-prices failed: ${error.message}`)
  return data as SourcePrices[]
}

/** Look up a PSA cert number for verified card metadata */
export async function psaLookup(certNumber: string): Promise<Partial<CardMetadata>> {
  const { data, error } = await supabase.functions.invoke('psa-lookup', {
    body: { certNumber },
  })
  if (error) throw new Error(`psa-lookup failed: ${error.message}`)
  return data as Partial<CardMetadata>
}

/** Get current USD → SGD exchange rate */
export async function getExchangeRate(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('exchange-rate', {
    body: {},
  })
  if (error) throw new Error(`exchange-rate failed: ${error.message}`)
  return (data as { usdToSgd: number }).usdToSgd
}
