-- VietCraft MVP, PostgreSQL 16+. Run on an empty database.
-- All monetary values are integer VND. Timestamps use UTC (timestamptz).
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  phone varchar(20),
  role varchar(12) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_ci_uq ON users (lower(email));

CREATE TABLE sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  slug varchar(180) NOT NULL UNIQUE,
  craft_village varchar(160),
  province varchar(100),
  story text,
  status varchar(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES sellers(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name varchar(200) NOT NULL,
  slug varchar(220) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  material varchar(120),
  origin_province varchar(100),
  price_vnd bigint NOT NULL CHECK (price_vnd >= 0),
  sale_price_vnd bigint CHECK (sale_price_vnd >= 0 AND sale_price_vnd < price_vnd),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  status varchar(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_ends_at > sale_starts_at)
);
CREATE INDEX products_browse_idx ON products (status, category_id, created_at DESC);
CREATE INDEX products_price_idx ON products (status, price_vnd);
CREATE INDEX products_search_idx ON products USING gin (to_tsvector('simple', name || ' ' || description));

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text varchar(255) NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);
CREATE INDEX product_images_order_idx ON product_images (product_id, sort_order);

CREATE TABLE addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name varchar(120) NOT NULL,
  phone varchar(20) NOT NULL,
  province varchar(100) NOT NULL,
  district varchar(100) NOT NULL,
  ward varchar(100) NOT NULL,
  address_line varchar(255) NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);
CREATE INDEX addresses_user_idx ON addresses (user_id);

CREATE TABLE cart_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  discount_type varchar(8) NOT NULL CHECK (discount_type IN ('fixed','percent')),
  discount_value bigint NOT NULL CHECK (discount_value > 0),
  max_discount_vnd bigint CHECK (max_discount_vnd > 0),
  min_subtotal_vnd bigint NOT NULL DEFAULT 0 CHECK (min_subtotal_vnd >= 0),
  usage_limit integer CHECK (usage_limit > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CHECK (ends_at > starts_at),
  CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CHECK (usage_limit IS NULL OR used_count <= usage_limit)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(30) NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_name varchar(120) NOT NULL,
  phone varchar(20) NOT NULL,
  shipping_address text NOT NULL,
  note text,
  status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','packing','shipping','delivered','cancelled')),
  payment_method varchar(12) NOT NULL CHECK (payment_method IN ('cod','bank_transfer','gateway')),
  payment_status varchar(12) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  subtotal_vnd bigint NOT NULL CHECK (subtotal_vnd >= 0),
  discount_vnd bigint NOT NULL DEFAULT 0 CHECK (discount_vnd >= 0),
  shipping_fee_vnd bigint NOT NULL DEFAULT 0 CHECK (shipping_fee_vnd >= 0),
  total_vnd bigint NOT NULL CHECK (total_vnd = subtotal_vnd - discount_vnd + shipping_fee_vnd AND total_vnd >= 0),
  promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL,
  idempotency_key varchar(100) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_vnd <= subtotal_vnd),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX orders_user_date_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_date_idx ON orders (status, created_at DESC);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  seller_id uuid REFERENCES sellers(id) ON DELETE RESTRICT,
  product_name varchar(200) NOT NULL,
  product_image_url text,
  unit_price_vnd bigint NOT NULL CHECK (unit_price_vnd >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_vnd bigint NOT NULL CHECK (line_total_vnd = unit_price_vnd * quantity)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider varchar(40) NOT NULL,
  provider_reference varchar(160),
  amount_vnd bigint NOT NULL CHECK (amount_vnd >= 0),
  status varchar(12) NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX payment_provider_reference_uq ON payment_attempts (provider, provider_reference) WHERE provider_reference IS NOT NULL;

CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  carrier varchar(80),
  tracking_number varchar(100),
  shipped_at timestamptz,
  delivered_at timestamptz
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  status varchar(12) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','visible','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX reviews_public_idx ON reviews (product_id, created_at DESC) WHERE status = 'visible';

CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  subject varchar(160) NOT NULL,
  message text NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
