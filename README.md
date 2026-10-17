# Làng Mộc

Dự án học phần xây dựng website thương mại điện tử cho sản phẩm làng nghề Việt Nam. Repo hiện có cây thư mục làm việc, thiết kế dữ liệu, API và kế hoạch nhóm. `frontend/` hiện có bản xem trước trang chủ React + Vite + TypeScript; `backend/` vẫn là khung trống. Giao diện đang dùng dữ liệu minh họa, chưa nối API.

1. [Kế hoạch và phân công bốn người](docs/TEAM_PLAN.md)
2. [Cấu trúc dữ liệu và ERD](docs/DATA_MODEL.md)
3. [SQL PostgreSQL khởi tạo](database/001_initial.sql)
4. [Hợp đồng API](docs/API.md)
5. [Cây thư mục và quy tắc đặt file](docs/PROJECT_STRUCTURE.md)

Sau khi đưa code giao diện hiện có vào repo, nhóm bổ sung tại đây lệnh cài thư viện, migration, seed, chạy frontend/backend, tài khoản demo, kiểm thử và triển khai. Trước khi ghép code, cả nhóm cần thống nhất các điểm còn mở ở cuối [TEAM_PLAN.md](docs/TEAM_PLAN.md).

## Chạy giao diện xem trước

```sh
cd frontend
npm install
npm run dev
```

Chạy `npm run build` để kiểm tra TypeScript và build production. Chi tiết phạm vi và thiết kế: [UI inventory](docs/design/ui-inventory.md).

## Storefront C1 hoàn thiện

Trang danh mục: `http://127.0.0.1:5173/#/catalog`. Đã có tìm/lọc/sắp xếp/phân trang, chi tiết, gallery, giá giảm, review demo và trạng thái tải/rỗng/lỗi. GET mock dùng 449 sản phẩm; chưa nối backend thật. Cách chuyển live và bàn giao C2 ở [UI inventory](docs/design/ui-inventory.md), minh chứng ở [storefront evidence](docs/evidence/storefront/README.md).

Tạo lại fixture sau khi sửa dữ liệu: `python3 scripts/prepare_frontend_catalog.py`. Chạy test với Node 22.18+ / 24+: `node --experimental-strip-types --test frontend/tests/catalog.test.ts`.
