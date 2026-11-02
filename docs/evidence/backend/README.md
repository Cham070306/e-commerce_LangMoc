# Minh chứng backend — PostgreSQL, xác thực & API danh mục/sản phẩm

Phần việc: **Khải** — PostgreSQL, xác thực & API danh mục/sản phẩm.
Sinh ngày 30/10/2026 trên máy Windows 11, PostgreSQL 16.15, Node v24.18.

## Nội dung thư mục

| File | Nội dung | Cách tạo lại |
|---|---|---|
| `http-checks.txt` | 33 lượt gọi API thật: catalog công khai, lỗi đầu vào, auth, phân quyền, địa chỉ, admin CRUD, logout. Ghi nguyên status và body. | `cd backend && npm run dev` (terminal 1); `npx tsx scripts/evidence_backend.ts` (terminal 2) |
| `test-results.txt` | Kết quả đầy đủ `npm test`: 31 test, 4 suite. | `node scripts/capture_test_results.mjs` |
| `schema-dump.sql` | `pg_dump --schema-only` của database sau migration + seed: 15 bảng. | `pg_dump -U langmoc_user -d langmoc_dev --schema-only -f docs/evidence/backend/schema-dump.sql` |

## Tóm tắt kết quả

### HTTP checks (`http-checks.txt`)

| Status | Số lượt | Ý nghĩa |
|---:|---:|---|
| 200 | 19 | GET catalog, login, me, admin list/patch |
| 201 | 3 | đăng ký/tạo địa chỉ/tạo danh mục/tạo sản phẩm |
| 204 | 2 | logout, xóa địa chỉ |
| 400 | 4 | sort sai, khoảng giá ngược, limit > 100, giá giảm >= giá gốc |
| 401 | 3 | `/auth/me` chưa đăng nhập, sai mật khẩu, sau logout |
| 403 | 1 | customer gọi `/admin/products` |
| 404 | 1 | slug sản phẩm không tồn tại |

Các điểm đã xác minh trong file:

- `/categories` trả đúng 4 danh mục seed với `product_count`: Gốm sứ 4, Mây tre đan 3, Nón lá 2, Thổ cẩm 3.
- `/products` mặc định `limit=12`, `total=12`; chỉ trả `status=active`.
- `?q=gom` tìm **không dấu** ra 4 sản phẩm gốm, sắp xếp `price_asc` đúng thứ tự 85.000 → 240.000 → 280.000 → 320.000.
- `?category=may-tre-dan` trả 3 sản phẩm; `?min_price=100000&max_price=200000` chỉ trả sản phẩm trong khoảng.
- `?sort=price_desc` đưa nón lá 1.155.000 lên đầu.
- Chi tiết `bat-chiet-yeu-3dfddfe5` trả đủ ảnh, `category_name`, `attributes`, `stock_quantity`.
- `/reviews` trả `summary.average_rating = null` khi chưa có review (không tự bịa điểm).
- Sản phẩm hết hàng (`binh-gom-nan-tay-2-00639bcf`) trả `stock_quantity: 0` để frontend xử lý.
- Giá giảm chỉ áp dụng trong thời hạn: `sale_price_vnd` 240.000 → `current_price_vnd` 240.000; hết hạn sẽ trả giá gốc.

### Test (`test-results.txt`)

31/31 pass, 0 fail. Phủ:

- **Auth (7)**: 401 khi chưa đăng nhập, đăng ký 201 đúng role customer, trùng email 409, email sai 400 có `fields`, login đúng đặt cookie, login sai 401, logout thu hồi session thật.
- **Phân quyền (5)**: khách 401, customer 403, admin 200, admin tạo/sửa danh mục + sản phẩm, chặn giá giảm >= giá gốc.
- **Địa chỉ (2)**: 401 khi chưa đăng nhập, customer xem/tạo/xóa địa chỉ của mình.
- **Catalog (17)**: 4 danh mục, phân trang, chỉ active, lọc danh mục, tìm không dấu, không có kết quả, sort tăng/giảm, lọc khoảng giá, từ chối sort lạ/khoảng giá ngược/limit > 100, chi tiết + ảnh, 404, review summary, envelope.

Test tự dọn dữ liệu sau khi chạy (`cleanupTestData`), nên database trở về đúng trạng thái seed: 4 danh mục, 12 sản phẩm, 2 người dùng, 12 ảnh.

## Giới hạn cần biết

- **Chưa chạy trên macOS.** SQL dùng `gen_random_uuid`, `unaccent`, cột generated, trigger — đều chuẩn PostgreSQL 16 nên macOS cũng chạy được, nhưng đây là suy luận. Cần một máy Mac chạy `npm run migrate && npm run seed && npm test` để xác nhận theo đúng yêu cầu nghiệm thu.
- **Không có minh chứng ảnh chụp màn hình.** Các file trên là output thật của API/test/schema, không phải ảnh. Nếu báo cáo cần ảnh, chụp màn hình terminal khi chạy `npm run dev`, `npm test` và psql `\dt`.
- **Chưa có danh mục "Sơn mài"** dù `DATA_MODEL.md` ghi 4 nhóm gồm sơn mài. Lý do: bộ ảnh/dữ liệu crawl hiện có không có sản phẩm sơn mài và không bịa ảnh. Danh mục thứ tư dùng "Nón lá" (7 sản phẩm thật từ Maries). Xem ghi chú trong `docs/DATA_MODEL.md`.
- Dữ liệu seed dùng ảnh local đã có trong `frontend/public/images/`; quyền tái sử dụng ảnh/nội dung nguồn cần nhóm xác minh trước khi công bố.
- Tài khoản demo (`admin@langmoc.local` / `Admin@123`, `customer@langmoc.local` / `Customer@123`) chỉ dùng local; phải đổi trước khi triển khai thật.
