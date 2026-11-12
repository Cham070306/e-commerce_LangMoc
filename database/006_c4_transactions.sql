-- C4 checkout support. Keep prior migrations immutable; this follows develop 001-005.
BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_fingerprint varchar(64);
-- Shared by API workers; no raw IP address is persisted.
CREATE TABLE IF NOT EXISTS c4_contact_rate_limits (
  key_hash varchar(64) PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0)
);
CREATE INDEX IF NOT EXISTS c4_contact_rate_expiry_idx ON c4_contact_rate_limits(expires_at);
COMMIT;
