# Làng Mộc

Dự án học phần xây dựng website thương mại điện tử cho sản phẩm làng nghề Việt Nam.

- `frontend/`: storefront React + Vite + TypeScript (trang chủ, danh mục, chi tiết sản phẩm).
- `backend/`: API Node.js + Express + TypeScript, PostgreSQL 16 (xác thực, catalog, admin catalog, địa chỉ).
- `database/`: schema, migration và seed.

Tài liệu:

1. [Kế hoạch và phân công bốn người](docs/TEAM_PLAN.md)
2. [Cấu trúc dữ liệu và ERD](docs/DATA_MODEL.md)
3. [Hợp đồng API](docs/API.md) — có mục **Trạng thái triển khai**
4. [Cây thư mục và quy tắc đặt file](docs/PROJECT_STRUCTURE.md)
5. [Bàn giao cho người tiếp theo](docs/HANDOVER.md)

## Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22.18+ hoặc 24+ | Bắt buộc để chạy `tsx` và test TypeScript |
| PostgreSQL | 16+ | Schema dùng `gen_random_uuid`, `unaccent`, cột generated |

Kiểm tra nhanh:

```sh
node --version
psql --version
```

## Cài đặt PostgreSQL

### Windows

1. Tải bản cài từ <https://www.postgresql.org/download/windows/> và cài PostgreSQL 16+. Ghi nhớ mật khẩu của user `postgres`.
2. Mở **SQL Shell (psql)** trong Start Menu (hoặc chạy `psql` từ `C:\Program Files\PostgreSQL\16\bin`). Nếu `psql` không có trên PATH, dùng đường dẫn đầy đủ hoặc thêm `...\PostgreSQL\16\bin` vào biến `Path`.
3. Tạo role và database cho dự án:

```sql
CREATE ROLE langmoc_user WITH LOGIN PASSWORD 'langmoc_dev_pass';
CREATE DATABASE langmoc_dev OWNER langmoc_user;
```

4. Đảm bảo service `postgresql-x64-16` đang chạy (`services.msc` hoặc `Get-Service postgresql*`).

### macOS

```sh
brew install postgresql@16
brew services start postgresql@16
createuser -s langmoc_user
psql -U langmoc_user -d postgres -c "ALTER ROLE langmoc_user WITH PASSWORD 'langmoc_dev_pass';"
createdb -O langmoc_user langmoc_dev
```

Nếu dùng Postgres.app, tạo role/database bằng psql trong app tương tự.

### Kiểm tra kết nối

```sh
psql "postgresql://langmoc_user:langmoc_dev_pass@localhost:5432/langmoc_dev" -c "SELECT current_database();"
```

## Chạy backend

```sh
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Mở `.env` và sửa `DATABASE_URL` cho khớp role/mật khẩu vừa tạo:

```env
DATABASE_URL=postgresql://langmoc_user:langmoc_dev_pass@localhost:5432/langmoc_dev
API_PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SESSION_SECRET=doi-thanh-chuoi-ngau-nhien-dai
SESSION_TTL_SECONDS=604800
COOKIE_SECURE=false
```

Chạy migration và seed:

```sh
npm run migrate     # chạy database/001, 002, 003 theo thứ tự
npm run seed        # 4 danh mục, 12 sản phẩm, ảnh, tài khoản demo
npm run dev         # API tại http://localhost:4000/api/v1
```

Kiểm tra:

```sh
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/categories
```

Build và chạy bản production:

```sh
npm run build
npm start
```

## Chạy frontend

```sh
cd frontend
npm install
npm run dev
```

Mặc định mở <http://127.0.0.1:5173/>.

### Nối frontend với backend thật

1. Copy `frontend/.env.example` thành `frontend/.env.local`.
2. Đặt:

```env
VITE_API_MODE=live
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:4000
```

3. Khởi động lại Vite. Proxy `/api` sẽ chuyển sang backend cổng 4000.

Mặc định frontend vẫn dùng **mock** (`VITE_API_MODE=mock`) để xem giao diện mà không cần backend. Mock không tự fallback khi ở live mode.

## Tài khoản demo

Chỉ dùng local, được tạo bởi `npm run seed`:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@langmoc.local` | `Admin@123` |
| Customer | `customer@langmoc.local` | `Customer@123` |

Hash được lưu trong seed dưới dạng bcrypt cost 12. **Không dùng mật khẩu này khi triển khai thật**; tạo tài khoản admin riêng và đổi mật khẩu.

## Kiểm thử

Backend (31 test, chạy trên PostgreSQL thật):

```sh
cd backend
npm test
```

Phủ: đăng ký/đăng nhập/logout/session thu hồi, phân quyền admin/customer, địa chỉ, catalog tìm không dấu/lọc/sắp xếp/phân trang, admin tạo-sửa danh mục và sản phẩm, validate giá giảm và tồn kho. Test tự dọn dữ liệu, database trở về đúng trạng thái seed sau khi chạy.

Minh chứng chạy thật (33 lượt gọi API, kết quả test, schema dump): [docs/evidence/backend/](docs/evidence/backend/README.md).

Frontend:

```sh
cd frontend
npm test       # test dữ liệu/lọc catalog (6 test)
npm run build  # kiểm tra TypeScript + build production
```

## API nhanh

Base URL `/api/v1`, envelope `{ data }` / `{ data, meta }`, lỗi `{ error: { code, message } }`.

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/auth/register` | công khai |
| POST | `/auth/login` | công khai |
| POST | `/auth/logout` | đã đăng nhập |
| GET | `/auth/me` | đã đăng nhập |
| GET/POST | `/me/addresses` | đã đăng nhập |
| DELETE | `/me/addresses/:id` | đã đăng nhập |
| GET | `/categories` | công khai |
| GET | `/products` | công khai |
| GET | `/products/:slug` | công khai |
| GET | `/products/:slug/reviews` | công khai |
| GET/POST | `/admin/categories` | admin |
| PATCH | `/admin/categories/:id` | admin |
| GET/POST | `/admin/products` | admin |
| GET/PATCH | `/admin/products/:id` | admin |

Chi tiết tham số và mã lỗi: [docs/API.md](docs/API.md).

## Cấu trúc thư mục

```text
backend/
├── src/
│   ├── config/env.ts          # đọc & kiểm tra biến môi trường
│   ├── db/pool.ts             # pool, query, withTransaction
│   ├── db/migrate.ts          # chạy database/*.sql theo thứ tự
│   ├── db/seed.ts             # chạy database/seeds/*.sql
│   ├── middleware/auth.ts     # attachUser, requireAuth, requireAdmin
│   ├── common/                # lỗi, envelope, slug, async handler
│   ├── modules/auth/          # auth service/routes, session, /me
│   ├── modules/addresses/     # địa chỉ giao hàng
│   ├── modules/catalog/       # GET categories/products/reviews
│   └── modules/admin/         # admin CRUD catalog
└── tests/                     # 31 test auth, quyền, catalog
database/
├── 001_initial.sql
├── 002_auth_catalog.sql
├── 003_product_image_unique.sql
└── seeds/001_demo.sql
```

## Ghi chú triển khai

- Không commit `.env`; chỉ commit `.env.example`. `.gitignore` đã chặn `.env` và `.env.*` (trừ `.env.example`).
- Session lưu DB dạng hash SHA-256 của token; token thô chỉ nằm trong cookie `HttpOnly`. Logout thu hồi session thật.
- Trước khi lên production: đổi `SESSION_SECRET`, đặt `COOKIE_SECURE=true` và chạy sau HTTPS, đổi mật khẩu tài khoản demo, cấu hình `FRONTEND_ORIGIN` đúng domain.
- Dữ liệu seed dùng ảnh local; quyền tái sử dụng ảnh/nội dung nguồn cần nhóm xác minh trước khi công bố (xem `data/catalog/README.md`).
- Phần chưa làm thuộc người phụ trách giao dịch: giỏ hàng, đặt COD, khuyến mại khi checkout, review ghi, contact, admin đơn/review/feedback.