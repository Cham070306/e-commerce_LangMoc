-- Migration 002: bổ sung cho auth (session), tìm kiếm không dấu và cập nhật updated_at.
-- Chạy sau 001_initial.sql. Mọi câu lệnh đều idempotent để chạy lặp an toàn.
BEGIN;

-- 1) Bảng phiên đăng nhập (session cookie HttpOnly, token lưu dạng hash SHA-256).
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  user_agent varchar(255),
  ip varchar(45),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at) WHERE revoked_at IS NULL;

-- 2) Hàm trigger cập nhật updated_at cho các bảng có cột này.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3) Chuẩn hóa tìm kiếm tiếng Việt có dấu/không dấu.
-- unaccent() là STABLE nên không dùng trực tiếp trong generated column / index biểu thức.
-- Bọc thành hàm IMMUTABLE (an toàn vì unaccent dùng từ điển cố định).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Cột sinh sẵn chứa tên + mô tả + chất liệu đã bỏ dấu, chữ thường để tìm ILIKE nhanh.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_text text
  GENERATED ALWAYS AS (
    lower(immutable_unaccent(coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(material, '')))
  ) STORED;

-- 4) Chỉ một địa chỉ mặc định mỗi người dùng.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_idx
  ON addresses (user_id)
  WHERE is_default;

-- 5) Cột bổ sung để API catalog khớp shape storefront (docs/API.md mục Storefront C1).
--    Tất cả nullable nên không phá dữ liệu cũ; admin có thể nhập dần.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku varchar(60);
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_name varchar(160);
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS collected_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS source_url text;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uq ON products (sku) WHERE sku IS NOT NULL;

COMMIT;
