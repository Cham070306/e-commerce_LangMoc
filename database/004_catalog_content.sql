-- Giữ ảnh nội dung và khoảng giá từ catalog storefront ban đầu.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_range_vnd jsonb;
COMMIT;
