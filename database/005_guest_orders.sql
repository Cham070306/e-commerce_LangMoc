BEGIN;
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_session_hash char(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_fingerprint char(64);
CREATE UNIQUE INDEX IF NOT EXISTS orders_guest_retry_uq
  ON orders(guest_session_hash,idempotency_key) WHERE user_id IS NULL;
COMMIT;
