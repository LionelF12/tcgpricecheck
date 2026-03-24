// Supabase Edge Function: exchange-rate
// Returns current USD → SGD exchange rate

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fallback rate if API is unavailable
const FALLBACK_USD_TO_SGD = 1.35

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Try exchangerate.host (free, no key required)
    let usdToSgd = FALLBACK_USD_TO_SGD

    try {
      const res = await fetch(
        'https://api.exchangerate.host/latest?base=USD&symbols=SGD',
        { signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const json = await res.json() as { rates?: { SGD?: number }; success?: boolean }
        if (json.success && json.rates?.SGD) {
          usdToSgd = json.rates.SGD
        }
      }
    } catch {
      // API unavailable — use fallback
    }

    return new Response(JSON.stringify({ usdToSgd }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message, usdToSgd: FALLBACK_USD_TO_SGD }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
