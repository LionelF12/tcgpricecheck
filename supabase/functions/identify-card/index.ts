// Supabase Edge Function: identify-card
// Accepts a base64 card image, sends to Claude Vision, returns structured CardMetadata

import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CardMetadata {
  name: string
  set: string
  year: number | null
  cardNumber: string | null
  grade: string | null
  gradingCompany: 'PSA' | 'BGS' | 'CGC' | 'RAW' | null
  slabId: string | null
  category: 'pokemon' | 'riftbound'
  imageUrl: string | null
  needsConfirmation: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image } = await req.json() as { image: string }

    if (!image) {
      return new Response(JSON.stringify({ error: 'image is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: anthropicKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a trading card expert specialising in Pokemon and Riftbound (League of Legends TCG) cards.
When given an image of a card, extract its metadata and return ONLY a valid JSON object.
Never include markdown, code fences, or extra text — return only the raw JSON.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: `Identify this trading card and return a JSON object with exactly these fields:
{
  "name": "Card name (string)",
  "set": "Set/expansion name (string, empty string if unknown)",
  "year": <year as number or null>,
  "cardNumber": "Card number e.g. 025/102 (string or null)",
  "grade": "Numeric grade e.g. 10 or 9.5 (string or null)",
  "gradingCompany": "PSA, BGS, CGC, RAW, or null",
  "slabId": "Certification/slab number (string or null)",
  "category": "pokemon or riftbound",
  "imageUrl": null,
  "needsConfirmation": <true if NOT PSA graded, false if PSA graded or raw confirmed>
}

Rules:
- needsConfirmation = true for BGS, CGC, or any non-PSA graded card, AND for ungraded cards (RAW) where you are less than 90% confident
- needsConfirmation = false for PSA-graded cards (PSA slabs have a distinctive bright red label)
- For Riftbound cards, category = "riftbound"; for Pokemon, category = "pokemon"
- If the card is not a trading card, still return the JSON with your best guess and needsConfirmation = true`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
    const metadata: CardMetadata = JSON.parse(cleaned)

    return new Response(JSON.stringify(metadata), {
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
