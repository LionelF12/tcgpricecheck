import { supabase } from './supabase'
import type { CardMetadata, SourcePrices } from './types'

/** Extract a human-readable error message from a Supabase functions error */
async function getFnError(name: string, error: any): Promise<Error> {
  try {
    // Try to read the actual JSON body from the edge function response
    const body = await error?.context?.json?.()
    if (body?.error) return new Error(`${name}: ${body.error}`)
  } catch {}
  return new Error(`${name}: ${error?.message ?? 'Unknown error'}`)
}

/** Send a base64 image to Claude Vision for card identification */
export async function identifyCard(base64Image: string): Promise<CardMetadata> {
  const { data, error } = await supabase.functions.invoke('identify-card', {
    body: { image: base64Image },
  })
  if (error) throw await getFnError('identify-card', error)
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
  if (error) throw await getFnError('get-prices', error)
  return data as SourcePrices[]
}

/** Look up a PSA cert number for verified card metadata */
export async function psaLookup(certNumber: string): Promise<Partial<CardMetadata>> {
  const { data, error } = await supabase.functions.invoke('psa-lookup', {
    body: { certNumber },
  })
  if (error) throw await getFnError('psa-lookup', error)
  return data as Partial<CardMetadata>
}

/** Get current USD → SGD exchange rate */
export async function getExchangeRate(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('exchange-rate', {
    body: {},
  })
  if (error) throw await getFnError('exchange-rate', error)
  return (data as { usdToSgd: number }).usdToSgd
}
