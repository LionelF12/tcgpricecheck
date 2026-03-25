// Supabase Edge Function: get-prices
// Returns price data for a card from Alt, eBay, and Snkrdunk.
// Alt: real data via Alt.xyz GraphQL + Typesense (live FMV + synthetic history)
// eBay: mock stub — wire up eBay Finding API when App ID is available
// Snkrdunk: mock stub — wire up Snkrdunk scraper when ready

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

// ─── MOCK FALLBACK ───────────────────────────────────────────────────────────

function seededRand(seed: string, index: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  h = (h ^ index ^ 0x9e3779b9) >>> 0
  return (h % 1000) / 1000
}

function generateMockPrices(cardName: string, grade: string | null, source: 'alt' | 'ebay' | 'snkrdunk'): SourcePrices {
  const seed = `${cardName}-${grade ?? 'raw'}-${source}`
  const gradeMultiplier = grade ? ({ '10': 8, '9.5': 4, '9': 2, '8.5': 1.5, '8': 1.2 } as Record<string, number>)[grade] ?? 1.5 : 1
  const base = (20 + seededRand(seed, 0) * 180) * gradeMultiplier

  const history: PricePoint[] = []
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  for (let i = 0; i < 52; i++) {
    const trend = 1 + (i / 52) * (seededRand(seed, i + 100) - 0.4) * 0.3
    const noise = 1 + (seededRand(seed, i) - 0.5) * 0.12
    history.push({ date: new Date(d).toISOString().split('T')[0], price: Math.round(base * trend * noise * 100) / 100 })
    d.setDate(d.getDate() + 7)
  }
  const r5 = history.slice(-5).map(p => p.price)
  const r3 = history.slice(-3).map(p => p.price)
  return {
    source,
    lastSold: history[history.length - 1].price,
    avg3Sales: Math.round(r3.reduce((a, b) => a + b, 0) / r3.length * 100) / 100,
    avg5Sales: Math.round(r5.reduce((a, b) => a + b, 0) / r5.length * 100) / 100,
    highest5Sales: Math.round(Math.max(...r5) * 100) / 100,
    history,
  }
}

// ─── ALT.XYZ ─────────────────────────────────────────────────────────────────
// Flow: GraphQL SearchServiceConfig → time-limited Typesense key → search listings
// altValue, altValueLowerBound, altValueUpperBound are in USD (not cents).
// Typesense only indexes active listings, so altValue (Alt's FMV estimate based on
// real market data) is used as the price anchor; history is synthetic within range.

interface TypesenseHit {
  document: {
    name: string
    altValue: number
    altValueLowerBound: number
    altValueUpperBound: number
    altValueConfidenceMetric: number
    gradeKey: string
    gradingCompany: string
    grade: string
    assetId: string
  }
}

async function getTypesenseConfig(): Promise<{ apiKey: string; host: string; collection: string } | null> {
  const res = await fetch(
    'https://alt-platform-server.production.internal.onlyalt.com/graphql/SearchServiceConfig',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query SearchServiceConfig{serviceConfig{search{universalSearch{clientConfig{nodes{host port protocol}apiKey}collectionName}}}}',
      }),
      signal: AbortSignal.timeout(6000),
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  const search = data?.data?.serviceConfig?.search?.universalSearch
  if (!search) return null
  return {
    apiKey: search.clientConfig.apiKey,
    host: search.clientConfig.nodes[0].host,
    collection: search.collectionName,
  }
}

function buildAltHistory(fmv: number, low: number, high: number): PricePoint[] {
  const history: PricePoint[] = []
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  const startPrice = low + (high - low) * 0.35
  for (let i = 0; i < 52; i++) {
    const t = i / 51
    const trend = startPrice + (fmv - startPrice) * t
    const noise = 1 + Math.sin(i * 1.7) * 0.035 + Math.sin(i * 0.9) * 0.035
    const price = Math.max(low * 0.85, Math.min(high * 1.15, Math.round(trend * noise * 100) / 100))
    history.push({ date: new Date(d).toISOString().split('T')[0], price })
    d.setDate(d.getDate() + 7)
  }
  return history
}

async function fetchAltPrices(
  cardName: string,
  set: string,
  gradingCompany: string | null,
  grade: string | null,
): Promise<SourcePrices> {
  try {
    const config = await getTypesenseConfig()
    if (!config) throw new Error('Could not get Typesense config')

    const qParts = [cardName, set].filter(Boolean)
    if (gradingCompany && gradingCompany !== 'RAW') qParts.push(gradingCompany)
    if (grade) qParts.push(grade)
    const query = qParts.join(' ')

    let filterBy = ''
    if (gradingCompany === 'PSA' && grade) {
      filterBy = `gradeKey:=PSA-${grade}`
    } else if (gradingCompany && gradingCompany !== 'RAW' && grade) {
      filterBy = `gradingCompany:=${gradingCompany}&&grade:=${grade}`
    }

    const searchBody: Record<string, unknown> = { q: query, preset: 'price_desc', per_page: 5, page: 1 }
    if (filterBy) searchBody.filter_by = filterBy

    const res = await fetch(
      `https://${config.host}/multi_search?collection=${config.collection}&use_cache=true`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TYPESENSE-API-KEY': config.apiKey },
        body: JSON.stringify({ searches: [searchBody] }),
        signal: AbortSignal.timeout(6000),
      }
    )
    if (!res.ok) throw new Error(`Typesense ${res.status}`)
    const json = await res.json()
    const hits: TypesenseHit[] = json?.results?.[0]?.hits ?? []

    if (hits.length === 0) throw new Error('No Alt listings found')

    // Pick the hit with highest FMV confidence score
    const best = hits.reduce((a, b) =>
      (b.document.altValueConfidenceMetric ?? 0) > (a.document.altValueConfidenceMetric ?? 0) ? b : a
    )
    const doc = best.document
    const fmv = doc.altValue
    const low = doc.altValueLowerBound ?? fmv * 0.75
    const high = doc.altValueUpperBound ?? fmv * 1.25

    if (!fmv || fmv <= 0) throw new Error('Invalid Alt FMV')

    const history = buildAltHistory(fmv, low, high)
    const r5 = history.slice(-5).map(p => p.price)
    const r3 = history.slice(-3).map(p => p.price)

    return {
      source: 'alt',
      lastSold: Math.round(fmv * 100) / 100,
      avg3Sales: Math.round(r3.reduce((a, b) => a + b, 0) / r3.length * 100) / 100,
      avg5Sales: Math.round(r5.reduce((a, b) => a + b, 0) / r5.length * 100) / 100,
      highest5Sales: Math.round(high * 100) / 100,
      history,
    }
  } catch (err) {
    console.error('[get-prices] Alt fallback:', err instanceof Error ? err.message : String(err))
    return generateMockPrices(cardName, grade, 'alt')
  }
}

// ─── EBAY ─────────────────────────────────────────────────────────────────────
// TODO: Wire up eBay Finding API (findCompletedItems — sold listings)
// Steps:
//   1. Register at developer.ebay.com → get App ID (Client ID)
//   2. Set secret: supabase secrets set EBAY_APP_ID=...
//   3. Call GET https://svcs.ebay.com/services/search/FindingService/v1
//        ?OPERATION-NAME=findCompletedItems
//        &SERVICE-VERSION=1.0.0
//        &SECURITY-APPNAME=<EBAY_APP_ID>
//        &RESPONSE-DATA-FORMAT=JSON
//        &keywords=<cardName+grade>
//        &itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true
//        &sortOrder=EndTimeSoonest
//   4. Parse response.findCompletedItemsResponse[0].searchResult[0].item[]
//      → sellingStatus.currentPrice.$, listingInfo.endTime

async function fetchEbayPrices(cardName: string, grade: string | null): Promise<SourcePrices> {
  // const appId = Deno.env.get('EBAY_APP_ID')
  // if (appId) { /* real eBay Finding API implementation goes here */ }
  return generateMockPrices(cardName, grade, 'ebay')
}

// ─── SNKRDUNK ────────────────────────────────────────────────────────────────
// TODO: Wire up Snkrdunk scraper (Japanese card marketplace, no public API)
// Steps:
//   1. Open https://snkrdunk.com/en/trading-card-categories/25 in browser DevTools
//   2. Search for a card, open Network tab → capture XHR/fetch API calls
//   3. Identify the internal search endpoint URL and required headers/auth tokens
//   4. Replicate those calls here with a Deno fetch

async function fetchSnkrdunkPrices(cardName: string, grade: string | null): Promise<SourcePrices> {
  // TODO: implement Snkrdunk API once endpoint is identified
  return generateMockPrices(cardName, grade, 'snkrdunk')
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cardName, set, grade, gradingCompany } = await req.json() as {
      cardName: string
      set?: string
      grade?: string | null
      gradingCompany?: string | null
    }

    const setStr = set ?? ''

    const prices: SourcePrices[] = await Promise.all([
      fetchAltPrices(cardName, setStr, gradingCompany ?? null, grade ?? null),
      fetchEbayPrices(cardName, grade ?? null),
      fetchSnkrdunkPrices(cardName, grade ?? null),
    ])

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
