// Supabase Edge Function: get-prices
// Returns price data for a card from Alt, eBay, and Snkrdunk.
// Currently returns realistic mock data. Replace each section with real API calls when keys are available.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PricePoint { date: string; price: number }
interface SourcePrices {
  source: 'alt' | 'ebay' | 'snkrdunk'
  lastSold: number | null
  avg3Sales: number | null
  avg5Sales: number | null
  highest5Sales: number | null
  history: PricePoint[]
}

/** Deterministic pseudo-random from a seed string */
function seededRand(seed: string, index: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  h = (h ^ index ^ 0x9e3779b9) >>> 0
  return (h % 1000) / 1000
}

function generateMockPrices(cardName: string, grade: string | null, source: 'alt' | 'ebay' | 'snkrdunk'): SourcePrices {
  const seed = `${cardName}-${grade ?? 'raw'}-${source}`

  // Base price varies by grade; PSA 10 is ~5-10x raw
  const gradeMultiplier = grade ? {
    '10': 8, '9.5': 4, '9': 2, '8.5': 1.5, '8': 1.2,
  }[grade] ?? 1.5 : 1

  const basePrice = 20 + seededRand(seed, 0) * 180 // $20–$200 base for a raw card
  const base = basePrice * gradeMultiplier

  // Generate 12 months of history (weekly data points ≈ 52 points)
  const history: PricePoint[] = []
  let currentDate = new Date()
  currentDate.setFullYear(currentDate.getFullYear() - 1)

  for (let i = 0; i < 52; i++) {
    const trend = 1 + (i / 52) * (seededRand(seed, i + 100) - 0.4) * 0.3
    const noise = 1 + (seededRand(seed, i) - 0.5) * 0.12
    history.push({
      date: new Date(currentDate).toISOString().split('T')[0],
      price: Math.round(base * trend * noise * 100) / 100,
    })
    currentDate.setDate(currentDate.getDate() + 7)
  }

  const recent5 = history.slice(-5).map((p) => p.price)
  const recent3 = history.slice(-3).map((p) => p.price)
  const lastSold = history[history.length - 1].price

  return {
    source,
    lastSold,
    avg3Sales: Math.round(recent3.reduce((a, b) => a + b, 0) / recent3.length * 100) / 100,
    avg5Sales: Math.round(recent5.reduce((a, b) => a + b, 0) / recent5.length * 100) / 100,
    highest5Sales: Math.round(Math.max(...recent5) * 100) / 100,
    history,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cardName, set, grade } = await req.json() as {
      cardName: string
      set?: string
      grade?: string | null
    }

    const fullName = set ? `${cardName} ${set}` : cardName

    // ──────────────────────────────────────────────────────────────────────────
    // TODO: Replace mock sections below with real API calls
    //
    // ALT (alt.com):
    //   No official API. Options:
    //   - Scrape: fetch('https://alt.com/search?query=<card>') and parse HTML
    //   - Watch for an official API announcement
    //
    // EBAY:
    //   Use eBay Browse API (completed items / sold listings):
    //   GET https://api.ebay.com/buy/browse/v1/item_summary/search
    //     ?q=<card>&filter=buyingOptions%3A%7BAUCTION%7D,conditions%3A%7BUSED%7D
    //     &fieldgroups=ASPECT_REFINEMENTS
    //   Requires eBay Developer account + OAuth token
    //
    // SNKRDUNK (スニーカーダンク):
    //   Japanese platform. No official API.
    //   Options:
    //   - Scrape their card listing pages
    //   - Use their internal GraphQL API (reverse-engineered, fragile)
    // ──────────────────────────────────────────────────────────────────────────

    const prices: SourcePrices[] = [
      generateMockPrices(fullName, grade ?? null, 'alt'),
      generateMockPrices(fullName, grade ?? null, 'ebay'),
      generateMockPrices(fullName, grade ?? null, 'snkrdunk'),
    ]

    return new Response(JSON.stringify(prices), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
