# TCG Price Check — Mobile App

iOS app for identifying Pokemon and Riftbound (League of Legends TCG) trading cards via camera/photo upload and looking up prices from Alt, eBay, and Snkrdunk.

## Quick Start

```bash
npm install
npx expo start
```
Scan QR with **Expo Go** on iPhone. Admin login: `admin@test.com` / `admin123`.

## Setup Steps

1. Add `.env` to project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://cncpwvkxwgixqnhssols.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

2. Run `supabase/migrations/001_mobile_tables.sql` in Supabase SQL Editor.

3. Deploy Edge Functions:
```bash
supabase login
supabase link --project-ref cncpwvkxwgixqnhssols
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy identify-card get-prices psa-lookup exchange-rate
```

4. Enable Google OAuth in Supabase Auth Settings with redirect `tcgpricecheck://auth/callback`.

See README for full API wiring instructions (eBay, Alt, Snkrdunk, PSA).
