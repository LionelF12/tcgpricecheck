// Supabase Edge Function: get-prices
// Returns price data for a card from Alt, CardLadder, eBay, and Snkrdunk.
//
// Alt: real FMV from Alt.xyz GraphQL + Typesense. No history — Alt's public API
//      exposes active listings only; lastSold = current FMV estimate.
//
// CardLadder: real sold transaction history via Firebase Auth + CardLadder Search API.
//      Requires secrets: CARDLADDER_EMAIL, CARDLADDER_PASSWORD
//      Setup: supabase secrets set CARDLADDER_EMAIL=... CARDLADDER_PASSWORD=...
//
// eBay: stub — wire up eBay Finding API when App ID is available
//      Setup: supabase secrets set EBAY_APP_ID=...
//
// Snkrdunk: stub — wire up Snkrdunk scraper when endpoint is identified

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PricePoint { date: string; price: number }

interface AltCandidate {
  name: string
  gradeKey: string
  fmv: number
  low: number
  high: number
  confidenceScore: number
  lastSold: number
  avg3Sales: number | null
  avg5Sales: number | null
  highest5Sales: number
  history: PricePoint[]
}

interface SourcePrices {
  source: 'alt' | 'ebay' | 'snkrdunk' | 'cardladder'
  lastSold: number | null
  avg3Sales: number | null
  avg5Sales: number | null
  highest5Sales: number | null
  history: PricePoint[]
  altCandidates?: AltCandidate[]
}

// ─── ALT.XYZ ─────────────────────────────────────────────────────────────────
// Flow: GraphQL SearchServiceConfig → time-limited Typesense key → search listings
// altValue is in USD. Typesense only indexes active listings — no historical sold data.
// Alt's public GraphQL API has no sales history endpoint (confirmed via probing).

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

function buildAltCandidate(doc: TypesenseHit['document']): AltCandidate {
  const fmv = doc.altValue
  const high = doc.altValueUpperBound ?? fmv * 1.25
  return {
    name: doc.name,
    gradeKey: doc.gradeKey ?? '',
    fmv,
    low: doc.altValueLowerBound ?? fmv * 0.75,
    high,
    confidenceScore: doc.altValueConfidenceMetric ?? 0,
    lastSold: Math.round(fmv * 100) / 100,
    avg3Sales: null,
    avg5Sales: null,
    highest5Sales: Math.round(high * 100) / 100,
    history: [],
  }
}

async function fetchAltPrices(
  cardName: string,
  set: string,
  gradingCompany: string | null,
  grade: string | null,
): Promise<SourcePrices> {
  const nullResult: SourcePrices = {
    source: 'alt',
    lastSold: null,
    avg3Sales: null,
    avg5Sales: null,
    highest5Sales: null,
    history: [],
    altCandidates: [],
  }

  try {
    const config = await getTypesenseConfig()
    if (!config) {
      console.error('[get-prices] Could not get Typesense config')
      return nullResult
    }

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

    const searchBody: Record<string, unknown> = { q: query, preset: 'price_desc', per_page: 10, page: 1 }
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
    if (!res.ok) {
      console.error(`[get-prices] Typesense ${res.status}`)
      return nullResult
    }
    const json = await res.json()
    const hits: TypesenseHit[] = json?.results?.[0]?.hits ?? []

    if (hits.length === 0) {
      console.error('[get-prices] No Alt listings found for:', query)
      return nullResult
    }

    // Sort by confidence descending, keep valid FMV only, take top 5
    const validHits = hits
      .filter(h => h.document.altValue > 0)
      .sort((a, b) => (b.document.altValueConfidenceMetric ?? 0) - (a.document.altValueConfidenceMetric ?? 0))
      .slice(0, 5)

    if (validHits.length === 0) {
      console.error('[get-prices] All Alt hits had invalid FMV')
      return nullResult
    }

    const altCandidates = validHits.map(h => buildAltCandidate(h.document))
    const best = altCandidates[0]

    return {
      source: 'alt',
      lastSold: best.lastSold,
      avg3Sales: null,
      avg5Sales: null,
      highest5Sales: best.highest5Sales,
      history: [],
      altCandidates,
    }
  } catch (err) {
    console.error('[get-prices] Alt error:', err instanceof Error ? err.message : String(err))
    return nullResult
  }
}

// ─── CARDLADDER ───────────────────────────────────────────────────────────────
// Firebase Auth + CardLadder Search API
// Firebase API key is public; credentials must be set as Supabase secrets.
//
// Setup:
//   supabase secrets set CARDLADDER_EMAIL=your@email.com CARDLADDER_PASSWORD=yourpassword
//
// Requires a free CardLadder account at https://app.cardladder.com

const CL_FIREBASE_API_KEY = 'AIzaSyBqbxgaaGlpeb1F6HRvEW319OcuCsbkAHM'
const CL_SEARCH_BASE = 'https://search-zzvl7ri3bq-uc.a.run.app'

async function getCardLadderToken(): Promise<string | null> {
  const email = Deno.env.get('CARDLADDER_EMAIL')
  const password = Deno.env.get('CARDLADDER_PASSWORD')
  if (!email || !password) return null

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CL_FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.idToken ?? null
}

async function fetchCardLadderPrices(
  cardName: string,
  set: string,
  grade: string | null,
  gradingCompany: string | null,
): Promise<SourcePrices> {
  const nullResult: SourcePrices = {
    source: 'cardladder',
    lastSold: null,
    avg3Sales: null,
    avg5Sales: null,
    highest5Sales: null,
    history: [],
  }

  try {
    const token = await getCardLadderToken()
    if (!token) {
      console.error('[get-prices] CardLadder credentials not configured')
      return nullResult
    }

    const headers = { Authorization: `Bearer ${token}` }

    // Step 1: Find the card in CardLadder's catalog
    const qParts = [cardName]
    if (set) qParts.push(set)
    if (gradingCompany && gradingCompany !== 'RAW') qParts.push(gradingCompany)
    if (grade) qParts.push(grade)
    const query = encodeURIComponent(qParts.join(' '))

    const cardRes = await fetch(
      `${CL_SEARCH_BASE}/search?index=cards&query=${query}&limit=5`,
      { headers, signal: AbortSignal.timeout(8000) }
    )
    if (!cardRes.ok) {
      console.error('[get-prices] CardLadder card search failed:', cardRes.status)
      return nullResult
    }
    const cardData = await cardRes.json()
    const cardHits: Array<{ id: string; title?: string; condition?: string }> = cardData.hits ?? []
    if (cardHits.length === 0) {
      console.error('[get-prices] CardLadder no card found for:', qParts.join(' '))
      return nullResult
    }

    const cardId = cardHits[0].id

    // Step 2: Get sales history for this card from the sales archive
    const salesRes = await fetch(
      `${CL_SEARCH_BASE}/search?index=salesarchive&filters=${encodeURIComponent('cardId:' + cardId)}&sort=date&direction=desc&limit=100`,
      { headers, signal: AbortSignal.timeout(8000) }
    )
    if (!salesRes.ok) {
      console.error('[get-prices] CardLadder sales fetch failed:', salesRes.status)
      return nullResult
    }
    const salesData = await salesRes.json()
    const salesHits: Array<{ price: number; date: string }> = salesData.hits ?? []
    if (salesHits.length === 0) {
      console.error('[get-prices] CardLadder no sales found for cardId:', cardId)
      return nullResult
    }

    // Parse and sort sales chronologically
    const history: PricePoint[] = salesHits
      .filter(h => h.price > 0 && h.date)
      .map(h => ({
        date: h.date.split('T')[0],
        price: Math.round(h.price * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (history.length === 0) return nullResult

    const recent = [...history].reverse() // most recent first
    const r5 = recent.slice(0, 5).map(p => p.price)
    const r3 = recent.slice(0, 3).map(p => p.price)
    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100

    return {
      source: 'cardladder',
      lastSold: recent[0].price,
      avg3Sales: r3.length >= 1 ? avg(r3) : null,
      avg5Sales: r5.length >= 1 ? avg(r5) : null,
      highest5Sales: r5.length >= 1 ? Math.round(Math.max(...r5) * 100) / 100 : null,
      history,
    }
  } catch (err) {
    console.error('[get-prices] CardLadder error:', err instanceof Error ? err.message : String(err))
    return nullResult
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

async function fetchEbayPrices(_cardName: string, _grade: string | null): Promise<SourcePrices> {
  // Real eBay Finding API not yet configured — return N/A until App ID is set
  // const appId = Deno.env.get('EBAY_APP_ID')
  // if (appId) { /* real eBay Finding API implementation goes here */ }
  return { source: 'ebay', lastSold: null, avg3Sales: null, avg5Sales: null, highest5Sales: null, history: [] }
}

// ─── SNKRDUNK ────────────────────────────────────────────────────────────────
// TODO: Wire up Snkrdunk scraper (Japanese card marketplace, no public API)
// Steps:
//   1. Open https://snkrdunk.com/en/trading-card-categories/25 in browser DevTools
//   2. Search for a card, open Network tab → capture XHR/fetch API calls
//   3. Identify the internal search endpoint URL and required headers/auth tokens
//   4. Replicate those calls here with a Deno fetch

async function fetchSnkrdunkPrices(_cardName: string, _grade: string | null): Promise<SourcePrices> {
  // Real Snkrdunk API not yet configured — return N/A until endpoint is identified
  return { source: 'snkrdunk', lastSold: null, avg3Sales: null, avg5Sales: null, highest5Sales: null, history: [] }
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
      fetchCardLadderPrices(cardName, setStr, grade ?? null, gradingCompany ?? null),
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
