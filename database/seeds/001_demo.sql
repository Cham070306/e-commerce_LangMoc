-- Seed demo Làng Mộc: 4 danh mục, 12 sản phẩm, ảnh local, 2 tài khoản demo.
-- Chạy sau 001_initial.sql + 002_auth_catalog.sql.
-- Chạy lặp an toàn nhờ ON CONFLICT DO NOTHING (UUID cố định).
-- Mật khẩu demo CHỈ dùng local: hash bcrypt cost 12 của "Admin@123" / "Customer@123".
BEGIN;

-- 1) Người dùng demo (role admin + customer).
INSERT INTO users (id, full_name, email, password_hash, phone, role)
VALUES
  ('c78915f3-76ff-41f0-a493-9106cc1ffb13', 'Quản trị Làng Mộc', 'admin@langmoc.local',
   '$2a$12$bWvy4pBnVZv6Zi5m8M87/OnvVwCgBOmjz4OfEIh6aN4A9SMyoJIky', '0900000001', 'admin'),
  ('9798f382-472b-436e-a704-b67e7d849951', 'Khách Hàng Demo', 'customer@langmoc.local',
   '$2a$12$t8RPGzlsn1QWKOn3AK9McOyt4gpXmKL16ze0ZdvaeBJkfTxenzDRm', '0900000002', 'customer')
ON CONFLICT DO NOTHING;

-- 2) Địa chỉ mẫu cho customer.
INSERT INTO addresses (id, user_id, recipient_name, phone, province, district, ward, address_line, is_default)
VALUES
  ('25872e31-4f2b-4210-aacb-f57732f0452d', '9798f382-472b-436e-a704-b67e7d849951',
   'Khách Hàng Demo', '0900000002', 'TP. Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé',
   'Số 1 Lê Lợi', true)
ON CONFLICT DO NOTHING;

-- 3) Làng nghề / người làm (sellers).
INSERT INTO sellers (id, name, slug, craft_village, province, story, status)
VALUES
  ('88b39e1e-c79b-4055-a535-043605fedd05', 'Gốm sứ Yên Lam', 'gom-su-yen-lam', 'Làng gốm Bát Tràng', 'Hà Nội',
   'Gốm thủ công men lam truyền thống vùng Bát Tràng.', 'active'),
  ('27f9b281-fe67-47b4-a1d5-d9efda13be95', 'Mây tre đan Làng Mộc', 'may-tre-dan-lang-moc', 'Làng nghề mây tre đan Phú Vinh', 'Hà Nội',
   'Sản phẩm mây tre đan bền đẹp, thân thiện môi trường.', 'active'),
  ('62d29599-11ed-4f43-af0f-45063d2f45f4', 'Thổ cẩm H''Mông', 'tho-cam-hmong', 'Bản làng vùng cao', 'Hà Giang',
   'Vải thổ cẩm dệt và thêu tay của đồng bào H''Mông.', 'active'),
  ('044733c2-61ed-4897-a061-18dcaeb322f0', 'Nón lá Maries', 'non-la-maries', 'Làng nón Chuông', 'Hà Nội',
   'Nón lá thời trang làm thủ công tại làng Chuông.', 'active')
ON CONFLICT DO NOTHING;

-- 4) Bốn danh mục bắt buộc.
INSERT INTO categories (id, name, slug, parent_id, is_active)
VALUES
  ('5592fabb-5b4d-4e14-a893-15627c9eaec0', 'Gốm sứ', 'gom-su', NULL, true),
  ('c9d9363c-a467-47ca-aac3-a3feb5b000ca', 'Mây tre đan', 'may-tre-dan', NULL, true),
  ('fe6d951b-a25c-42a5-ab60-5d57c0bd498c', 'Thổ cẩm', 'tho-cam', NULL, true),
  ('3c72de8a-17f4-473f-a360-248e73a109cd', 'Nón lá', 'non-la', NULL, true)
ON CONFLICT (slug) DO NOTHING;

-- 5) Mười hai sản phẩm (3 mỗi danh mục), ảnh dùng đường dẫn local trong frontend/public.
--    Giá là VND nguyên; có 1 sản phẩm hết hàng và 1 sản phẩm có giá giảm để test lọc/sắp xếp.
INSERT INTO products
  (id, seller_id, category_id, name, slug, description, material, origin_province,
   price_vnd, sale_price_vnd, sale_starts_at, sale_ends_at, stock_quantity, status,
   sku, source_name, source_url, collected_at, attributes, is_demo, price_is_demo)
VALUES
  -- Gốm sứ (4)
  ('163fceb7-100a-4b85-acea-95940be36acd', '88b39e1e-c79b-4055-a535-043605fedd05',
   '5592fabb-5b4d-4e14-a893-15627c9eaec0', 'Bát Chiết Yêu', 'bat-chiet-yeu-3dfddfe5',
   'Lấy cảm hứng từ hình ảnh đám mây trắng kết hợp phương pháp làm gốm thủ công truyền thống.',
   'Gốm sứ', 'Hà Nội', 85000, NULL, NULL, NULL, 50, 'active',
   NULL, 'Gốm sứ Yên Lam', 'https://yenlam.vn', '2026-10-14T14:44:08Z', '{}', true, false),
  ('f74de179-c5a8-44d4-a328-1936798c6a40', '88b39e1e-c79b-4055-a535-043605fedd05',
   '5592fabb-5b4d-4e14-a893-15627c9eaec0', 'Bình Gốm Nắn Tay', 'binh-gom-nan-tay-4f6e34df',
   'Sản phẩm được tạo hình thủ công bằng phương pháp nắn tay be trạc.',
   'Gốm sứ', 'Hà Nội', 280000, NULL, NULL, NULL, 20, 'active',
   NULL, 'Gốm sứ Yên Lam', 'https://yenlam.vn', '2026-10-14T14:44:08Z', '{}', true, false),
  ('1e35f2be-26a7-45cd-a259-c21dcbf5b712', '88b39e1e-c79b-4055-a535-043605fedd05',
   '5592fabb-5b4d-4e14-a893-15627c9eaec0', 'Bình Gốm Nắn Tay (mẫu 2)', 'binh-gom-nan-tay-2-00639bcf',
   'Bình gốm nắn tay men tự nhiên, phù hợp trang trí nội thất.',
   'Gốm sứ', 'Hà Nội', 280000, 240000, now() - interval '1 day', now() + interval '30 days', 0, 'active',
   NULL, 'Gốm sứ Yên Lam', 'https://yenlam.vn', '2026-10-14T14:44:08Z', '{}', true, false),
  ('36708ddc-900b-4b75-a3e2-02e190241662', '88b39e1e-c79b-4055-a535-043605fedd05',
   '5592fabb-5b4d-4e14-a893-15627c9eaec0', 'Bình Gốm Nắn Tay Họa Tiết Hoa Nổi', 'binh-gom-nan-tay-doa-hoa-noi-4a65da25',
   'Sản phẩm tạo hình thủ công với họa tiết hoa nổi tinh xảo.',
   'Gốm sứ', 'Hà Nội', 320000, NULL, NULL, NULL, 15, 'active',
   NULL, 'Gốm sứ Yên Lam', 'https://yenlam.vn', '2026-10-14T14:44:08Z', '{}', true, false),
  -- Mây tre đan (3)
  ('2ac6a7d2-e1d2-403c-ac16-2404d248599d', '27f9b281-fe67-47b4-a1d5-d9efda13be95',
   'c9d9363c-a467-47ca-aac3-a3feb5b000ca', 'Giỏ Mây Tre Đan', 'gio-may-tre-dan',
   'Giỏ mây tre đan thủ công, bền đẹp và thân thiện môi trường.',
   'Mây tre', 'Hà Nội', 150000, NULL, NULL, NULL, 30, 'active',
   'MTD-GIO-01', 'Mây tre đan Làng Mộc', 'https://langmoc.local', now(), '{"dimensions": "25x25x30cm"}', true, false),
  ('bdc08528-89e7-44d1-a463-a4bfa7862029', '27f9b281-fe67-47b4-a1d5-d9efda13be95',
   'c9d9363c-a467-47ca-aac3-a3feb5b000ca', 'Khay Mây Tre Đan', 'khay-may-tre-dan',
   'Khay mây tre đan dùng đựng đồ hoặc bày biện, thiết kế mộc mạc.',
   'Mây tre', 'Hà Nội', 120000, NULL, NULL, NULL, 25, 'active',
   'MTD-KHAY-01', 'Mây tre đan Làng Mộc', 'https://langmoc.local', now(), '{"dimensions": "35x25x8cm"}', true, false),
  ('a1b2c3d4-0000-4000-a000-000000000301', '27f9b281-fe67-47b4-a1d5-d9efda13be95',
   'c9d9363c-a467-47ca-aac3-a3feb5b000ca', 'Đèn Lồng Mây Tre', 'den-long-may-tre',
   'Đèn lồng mây tre đan trang trí, ánh sáng ấm áp cho không gian sống.',
   'Mây tre', 'Hà Nội', 210000, NULL, NULL, NULL, 12, 'active',
   'MTD-DEN-01', 'Mây tre đan Làng Mộc', 'https://langmoc.local', now(), '{"dimensions": "20x20x25cm"}', true, false),
  -- Thổ cẩm (3)
  ('7c7f84bd-aa46-4a84-ad8c-b43f006dc7c2', '62d29599-11ed-4f43-af0f-45063d2f45f4',
   'fe6d951b-a25c-42a5-ab60-5d57c0bd498c', 'Balô phối vải thêu tay H''Mông', 'balo-phoi-vai-theu-tay-h-mong-d51e21fd',
   'Balô phối vải thêu tay H''Mông handmade, kết hợp vải sợi tự nhiên và họa tiết thổ cẩm.',
   'Vải sợi tự nhiên', 'Hà Giang', 420000, 310000, now() - interval '2 days', now() + interval '21 days', 18, 'active',
   NULL, 'Balo Thổ Cẩm', 'https://balothocam.com', '2026-10-14T14:44:08Z',
   '{"material": "vải sợi tự nhiên phối họa tiết thêu tay", "dimensions": "18x20cm"}', true, false),
  ('81a59934-a952-4e5f-a7ad-c4aba4830591', '62d29599-11ed-4f43-af0f-45063d2f45f4',
   'fe6d951b-a25c-42a5-ab60-5d57c0bd498c', 'Balo Cú Lớn (BC111)', 'balo-cu-lon-bc111-4b35fd2d',
   'Balo thổ cẩm lớn handmade, size đại rộng rãi, hoa văn dân tộc độc đáo.',
   'Vải thổ cẩm', 'Hà Giang', 180000, NULL, NULL, NULL, 22, 'active',
   'BC111', 'Balo Thổ Cẩm', 'https://balothocam.com', '2026-10-14T14:44:08Z', '{}', true, false),
  ('a9ad0f97-12e4-4971-aa21-974990b6b484', '62d29599-11ed-4f43-af0f-45063d2f45f4',
   'fe6d951b-a25c-42a5-ab60-5d57c0bd498c', 'Balo Cú Nhỏ (BC406)', 'balo-cu-nho-bc406-c170f93a',
   'Balo cú nhỏ thổ cẩm handmade, kiểu dáng nhỏ gọn với họa tiết cú mèo.',
   'Vải thổ cẩm', 'Hà Giang', 150000, NULL, NULL, NULL, 35, 'active',
   'BC406', 'Balo Thổ Cẩm', 'https://balothocam.com', '2026-10-14T14:44:08Z', '{}', true, false),
  -- Nón lá (2)
  ('42b62eec-a1e6-49eb-a666-43dc08fee523', '044733c2-61ed-4897-a061-18dcaeb322f0',
   '3c72de8a-17f4-473f-a360-248e73a109cd', 'Nón Lá NCBPR30', 'ncbpr30-3056a98f',
   'Nón lá thời trang Maries, thủ công tinh xảo từ làng nón Chuông.',
   'Lá nón', 'Hà Nội', 1155000, NULL, NULL, NULL, 10, 'active',
   'NCBPR30', 'Maries', 'https://maries.vn', '2026-10-14T14:44:08Z', '{}', true, false),
  ('4f369288-3073-4a0a-aa0e-5d93f2be6089', '044733c2-61ed-4897-a061-18dcaeb322f0',
   '3c72de8a-17f4-473f-a360-248e73a109cd', 'Nón Lá NCBPR34', 'ncbpr34-862a752c',
   'Nón lá thời trang Maries, vành rộng, phù hợp nhiều phong cách.',
   'Lá nón', 'Hà Nội', 1155000, NULL, NULL, NULL, 8, 'active',
   'NCBPR34', 'Maries', 'https://maries.vn', '2026-10-14T14:44:08Z', '{}', true, false)
ON CONFLICT (id) DO NOTHING;

-- 6) Ảnh sản phẩm (đường dẫn local dưới frontend/public).
INSERT INTO product_images (product_id, image_url, alt_text, sort_order)
VALUES
  ('163fceb7-100a-4b85-acea-95940be36acd', '/images/products/57c220ed93cb8a007a77.jpg', 'Bát Chiết Yêu', 0),
  ('f74de179-c5a8-44d4-a328-1936798c6a40', '/images/products/389e72bca98e9e92357b.jpg', 'Bình Gốm Nắn Tay', 0),
  ('1e35f2be-26a7-45cd-a259-c21dcbf5b712', '/images/products/71a9e103a63af30c6bcd.jpg', 'Bình Gốm Nắn Tay mẫu 2', 0),
  ('36708ddc-900b-4b75-a3e2-02e190241662', '/images/products/0bfed35e141e25e627ab.jpg', 'Bình Gốm Nắn Tay Họa Tiết Hoa Nổi', 0),
  ('2ac6a7d2-e1d2-403c-ac16-2404d248599d', '/images/crafts/15-weaving-workshop.jpeg', 'Giỏ Mây Tre Đan', 0),
  ('bdc08528-89e7-44d1-a463-a4bfa7862029', '/images/crafts/14-kim-son-seagrass.jpeg', 'Khay Mây Tre Đan', 0),
  ('a1b2c3d4-0000-4000-a000-000000000301', '/images/crafts/13-bamboo-market.jpeg', 'Đèn Lồng Mây Tre', 0),
  ('7c7f84bd-aa46-4a84-ad8c-b43f006dc7c2', '/images/products/920734147e1d210989aa.jpg', 'Balô phối vải thêu tay H''Mông', 0),
  ('81a59934-a952-4e5f-a7ad-c4aba4830591', '/images/products/d4435d388c98f601abe4.jpg', 'Balo Cú Lớn (BC111)', 0),
  ('a9ad0f97-12e4-4971-aa21-974990b6b484', '/images/products/b7d4e8dd30a504184aab.jpg', 'Balo Cú Nhỏ (BC406)', 0),
  ('42b62eec-a1e6-49eb-a666-43dc08fee523', '/images/products/3a85edcab41dd4628844.jpg', 'Nón Lá NCBPR30', 0),
  ('4f369288-3073-4a0a-aa0e-5d93f2be6089', '/images/products/acc37274f9c858e2430f.jpg', 'Nón Lá NCBPR34', 0)
ON CONFLICT (product_id, sort_order) DO NOTHING;

-- 7) Khuyến mại mẫu: một mã hợp lệ và một mã đã hết hạn (để test C4 sau này).
INSERT INTO promotions (id, code, discount_type, discount_value, max_discount_vnd, min_subtotal_vnd,
                        usage_limit, used_count, starts_at, ends_at, is_active)
VALUES
  ('0baf1755-2e8f-4f66-abc8-2ddf742a41e7', 'LANGMOC10', 'percent', 10, 100000, 200000,
   100, 0, now() - interval '1 day', now() + interval '60 days', true),
  ('8b0ccfbb-2c7d-434f-a817-74e2816550b7', 'HETHAN', 'fixed', 50000, NULL, 0,
   50, 0, now() - interval '60 days', now() - interval '1 day', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
