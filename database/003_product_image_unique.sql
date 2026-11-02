-- Migration 003: chống trùng ảnh sản phẩm để seed chạy lặp an toàn.
-- Mỗi sản phẩm chỉ có một ảnh cho mỗi sort_order.
BEGIN;

-- Dọn ảnh trùng phát sinh trước khi thêm ràng buộc (giữ bản ghi cũ nhất).
DELETE FROM product_images a
USING product_images b
WHERE a.product_id = b.product_id
  AND a.sort_order = b.sort_order
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS product_images_product_sort_uq
  ON product_images (product_id, sort_order);

COMMIT;
