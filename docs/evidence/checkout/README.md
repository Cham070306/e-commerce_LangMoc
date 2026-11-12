# Minh chứng C4 của Sơn

Ngày chạy log gốc: 11/11/2026. Nhánh `feature/son-c4-transactions`. Kết quả mới hơn trên branch tích hợp `feature/son-c4-develop` được ghi ở [integrated validation ngày 13/11/2026](integrated-validation-2026-11-13.md).

## Đã kiểm chứng

- Unit: thời hạn giá giảm, làm tròn/cap giảm giá, nguyên VND, quote gắn user/nội dung/hạn/secret, phân trang sai.
- PostgreSQL thật với nhiều connection: đơn lặp, tồn cạnh tranh, mã một lượt, rollback, ownership/admin, review/contact, luồng HTTP.
- Frontend: 60 test hiện có đạt, TypeScript và build production đạt sau khi nối quote.

Log backend: [backend-tests.txt](backend-tests.txt): **17/17 đạt**, 0 lỗi, 0 bỏ qua (gồm 4 unit, 12 ca integration và nhóm test cha). Node 24.22.1, PostgreSQL 18.6, Windows x64. Ma trận và dữ liệu thử: [checkout.md](../../testing/checkout.md).

Lệnh backend từ gốc repo: `node --test backend/tests/business.test.mjs backend/tests/postgres.integration.mjs`. Frontend chạy danh sách 11 file trong script `test` của package.json: **60/60 đạt**. `tsc -b` và `vite build` đạt; build tạo 1628 module, không thay layout. Đây là kết quả chạy trong phiên này; test frontend vẫn kiểm mock C2, không được ghi thành kiểm thử live C3.

## Chưa kiểm chứng

Các quyết định trong nhánh chưa được xem là nhóm đã phê duyệt. Mock hiện chưa trả/kiểm tra checkout_quote; cần Quân/Khải xác nhận bổ sung này và đồng bộ trước nghiệm thu.

- Auth/catalog/địa chỉ C3 ghép frontend C2; trình duyệt live desktop/mobile và ảnh.
- PostgreSQL major version nhóm chọn (integration dùng 18.6), macOS, máy thứ hai.
- Gateway/webhook, guest live, lưu điều khoản, đối soát COD.

Không ghi Pass các mục trên. Resolver xác thực fixture chỉ nằm trong test; code triển khai yêu cầu resolver C3. Không có token/tài khoản triển khai trong minh chứng.
