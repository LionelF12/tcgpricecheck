// Supabase Edge Function: psa-lookup
// Looks up a PSA certification number and returns card metadata.
// Currently returns mock data. Real implementation should scrape psacard.com/cert/{id}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { certNumber } = await req.json() as { certNumber: string }

    if (!certNumber) {
      return new Response(JSON.stringify({ error: 'certNumber is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TODO: Real PSA cert lookup
    //
    // Option 1 (preferred): PSA provides a cert verification page at:
    //   https://www.psacard.com/cert/{certNumber}
    //   Scrape this page — look for: card name, year, grade, set, card number
    //
    // Option 2: PSA API (requires PSA developer account)
    //   POST https://api.psacard.com/publicapi/cert/GetByCertNumber/{certNumber}
    //   Headers: Authorization: bearer <PSA_API_TOKEN>
    //
    // Example scrape approach:
    //   const res = await fetch(`https://www.psacard.com/cert/${certNumber}`)
    //   const html = await res.text()
    //   // Parse: card name, year, grade, set from HTML
    // ──────────────────────────────────────────────────────────────────────────

    // Mock response for development
    const mockData = {
      name: `Card #${certNumber.slice(-4)}`,
      set: 'Mock Set',
      year: 1999,
      cardNumber: `${certNumber.slice(-3)}/102`,
      grade: '10',
      gradingCompany: 'PSA' as const,
      slabId: certNumber,
      needsConfirmation: false,
    }

    return new Response(JSON.stringify(mockData), {
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
