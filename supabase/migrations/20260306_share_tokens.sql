-- Add share_token for shareable waypoint links
ALTER TABLE spots ADD COLUMN share_token text UNIQUE;

-- Backfill existing spots with 8-char tokens
UPDATE spots SET share_token = substr(md5(random()::text), 1, 8) WHERE share_token IS NULL;

-- Make NOT NULL with default for new rows
ALTER TABLE spots ALTER COLUMN share_token SET NOT NULL;
ALTER TABLE spots ALTER COLUMN share_token SET DEFAULT substr(md5(random()::text), 1, 8);

-- Index for fast lookups
CREATE INDEX idx_spots_share_token ON spots(share_token);

-- RPC function to fetch a spot by share_token (bypasses RLS for "anyone with the link" access)
CREATE OR REPLACE FUNCTION get_spot_by_share_token(token text)
RETURNS SETOF spots
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM spots WHERE share_token = token LIMIT 1;
$$;
