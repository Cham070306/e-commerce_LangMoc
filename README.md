# Làng Mộc

Website học phần thương mại điện tử sản phẩm làng nghề Việt Nam. Frontend React + Vite + TypeScript; backend Express + TypeScript; PostgreSQL.

## Trạng thái hiện tại — 03/11/2026

- Storefront có trang chủ, catalog, tìm kiếm không dấu, lọc, sắp xếp, phân trang, chi tiết và gallery.
- Auth/session cookie, phân quyền, sổ địa chỉ, catalog và admin danh mục/sản phẩm đã có API PostgreSQL.
- Địa chỉ mới chọn tỉnh rồi phường/xã; backend kiểm tra cặp hợp lệ. Địa chỉ cũ vẫn đọc được. [Nguồn dữ liệu](docs/ADDRESS_DATA.md).
- Admin sản phẩm hỗ trợ tên, giá, tồn, trạng thái, mô tả, SKU, đơn vị nguồn và gallery bằng URL/ảnh local; có xem trước, đổi thứ tự và xóa ảnh. Chưa có upload file từ máy.
- Frontend mặc định dùng mock. API giao dịch tài khoản, khuyến mại, review ghi, contact và admin giao dịch vẫn thuộc phần tích hợp C4; thành công trên mock không chứng minh các API này đã hoàn tất.
- Guest COD đã có module riêng trên DB, mặc định bật: [hướng dẫn và giới hạn](docs/GUEST_CHECKOUT.md). Không dùng module này để kết luận toàn bộ C4 hoàn thành.
- Catalog mock có 452 sản phẩm, gồm 449 bản nguồn và 3 sản phẩm mây tre demo từ seed. Giá/tồn/ảnh seed là minh họa. Thông tin nguồn chưa có vẫn được ghi rõ chưa xác minh; không tự tạo xuất xứ hoặc thông số sản phẩm.
- Hotline `0987223434`, email `langmoc.support@gmail.com` do người dùng cung cấp. Giờ làm việc chưa được cung cấp; có thể cấu hình qua môi trường.

[Bản sửa và kiểm tra lại](docs/FIXES_2026-11-03.md) · [Phân công](docs/TEAM_PLAN.md) · [API](docs/API.md) · [Dữ liệu](docs/DATA_MODEL.md) · [Bàn giao tích hợp](docs/KHAI_QUAN_HANDOVER.md).

## Môi trường

Node.js 22.18+ hoặc 24+, npm; PostgreSQL 16+ theo yêu cầu dự án. Lượt kiểm tra local hiện dùng Node 26.8.1 và PostgreSQL 14.24 có sẵn; chưa xác nhận Windows/PostgreSQL 16 hoặc điện thoại vật lý.

## Backend

Tạo database local và role có quyền tạo bảng/extension `unaccent`, sau đó:

```sh
cd backend
npm ci
cp .env.example .env
# Sửa DATABASE_URL và FRONTEND_ORIGIN theo môi trường local của bạn.
npm run migrate
npm run seed
npm run import:catalog
npm run dev
```

API mặc định tại `http://127.0.0.1:4000/api/v1`; kiểm tra `GET /health` và `GET /categories`. Không chạy seed/import lên dữ liệu thật khi chưa backup.

Migration chạy theo thứ tự các file SQL. Seed tạo 4 danh mục, 12 sản phẩm và hai tài khoản demo. Import đồng bộ 452 sản phẩm trong fixture: trùng slug cập nhật nội dung, giữ ID/tồn/trạng thái hiện có; không xóa sản phẩm khác. Chạy lại không nhân đôi nhưng sẽ ghi lại giá/nội dung/ảnh nguồn. Sản phẩm mới có tồn demo 8.

```sh
npm run build
npm start
```

## Frontend

```sh
cd frontend
npm ci
npm run dev
```

Mở `http://127.0.0.1:5173/`. Mock chỉ có trong Vite dev/preview; đưa riêng `dist/` lên static host sẽ không có mock API.

Để chạy live, copy `.env.example` thành `.env.local` và đặt:

```env
VITE_API_MODE=live
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:4000
```

Khởi động lại Vite. `FRONTEND_ORIGIN` ở backend phải trùng origin frontend. Live không âm thầm chuyển sang mock khi API lỗi.

## Tài khoản demo local

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@langmoc.local | Admin@123 |
| Customer | customer@langmoc.local | Customer@123 |

Mock có tài khoản dùng thử riêng hiển thị ở trang đăng nhập. Không dùng các mật khẩu demo để triển khai thật.

## Kiểm thử

```sh
cd frontend
npm test
npm run build
```

Frontend có test catalog, contract địa chỉ/auth, giỏ/checkout, admin/contact mock và các ca hồi quy redirect/cập nhật giỏ. Đây không phải bộ E2E đầy đủ.

```sh
cd backend
npm run build
# Cần DATABASE_URL trỏ tới database kiểm thử đã migrate/seed.
node --import tsx --test --test-concurrency=1 tests/auth.test.ts tests/catalog.test.ts
# Toàn bộ test backend, gồm guest:
npm test
# Khi API đang chạy và đã import:
node scripts/verify-catalog-import.mjs
```

Các bài test có ghi dữ liệu giả lập; chỉ chạy trên database kiểm thử riêng. Log mới: `docs/evidence/fixes-2026-11-03/`. Minh chứng cũ được giữ theo ngày, không coi số lượng test cũ là hiện trạng.

## Cấu hình và dữ liệu khi triển khai

Không commit `.env`, thông tin tài khoản thật hoặc database dump. Đặt secret riêng, cookie secure và HTTPS khi triển khai; đổi tài khoản demo. Các biến `VITE_*` là công khai, không chứa secret.

Snapshot tỉnh/xã được đóng gói local và có ghi công theo CC-BY-4.0 tại [ADDRESS_DATA.md](docs/ADDRESS_DATA.md). Ảnh/nội dung catalog và giá nguồn cần được nhóm xác minh quyền sử dụng, độ chính xác và tồn kho trước khi mở bán thực tế. Chính sách trên website đã được biên tập cho phạm vi bản học phần, không mô tả các chức năng giải ngân/hoàn tiền tự động chưa có.
