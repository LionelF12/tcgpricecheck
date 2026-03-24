-- Mobile app tables for TCG Price Check
-- Run this in the Supabase SQL Editor for project: cncpwvkxwgixqnhssols

-- ─── Search History ─────────────────────────────────────────────────────────
-- Stores every search result for 7-day quick re-access
CREATE TABLE IF NOT EXISTS mobile_search_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name   TEXT        NOT NULL,
  card_image  TEXT,                     -- Optional image URI or URL
  result_data JSONB,                    -- Full CardResult stored as JSON
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_search_history_user_created
  ON mobile_search_history(user_id, created_at DESC);

ALTER TABLE mobile_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own search history"
  ON mobile_search_history
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Personal Collection ────────────────────────────────────────────────────
-- User-curated saved cards with metadata and price snapshot
CREATE TABLE IF NOT EXISTS mobile_collection (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_name      TEXT        NOT NULL,
  card_image     TEXT,                   -- Optional image URI or URL
  metadata       JSONB       NOT NULL,  -- CardMetadata as JSON
  price_snapshot JSONB,                 -- SourcePrices[] at time of saving
  saved_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_collection_user_saved
  ON mobile_collection(user_id, saved_at DESC);

ALTER TABLE mobile_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own collection"
  ON mobile_collection
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Optional: Auto-cleanup function for 7-day search history ───────────────
-- Schedule this with pg_cron (Supabase cron jobs in Settings > Database > Cron Jobs)
-- Run: DELETE FROM mobile_search_history WHERE created_at < now() - interval '7 days'
-- Cron: 0 3 * * * (daily at 3 AM UTC)
