# Kiểm chứng tích hợp C4 — 13/11/2026

Branch: `feature/son-c4-develop`

Môi trường: Windows x64, Node.js 24.22.3, PostgreSQL nhúng 18.6.

## Kết quả

| Phần | Kết quả |
|---|---:|
| Backend C3 auth, quyền, địa chỉ, catalog và guest checkout trên PostgreSQL tạm | 39/39 đạt |
| Backend C4 unit và PostgreSQL integration riêng | 17/17 đạt |
| Backend TypeScript build | Đạt |
| Frontend tests | 72/72 đạt |
| Frontend TypeScript + Vite production build | Đạt |

C3 tests chạy sau khi tạo PostgreSQL tạm, chạy migration 001–006 và seed. C4 integration tạo cluster riêng và kiểm tra retry idempotency, tồn kho đồng thời, rollback, quote, quyền, review/contact và API HTTP. Không dùng database cá nhân.

## Lỗi phát hiện và sửa

Lượt kiểm tra C3 đầu tiên phát hiện C4 đang bắt nhầm đường dẫn review theo slug, trả 400 thay vì để catalog C3 xử lý. Route GET/POST review C4 đã giới hạn cho UUID; test C3 chạy lại đạt 39/39.

## Giới hạn môi trường

Đã kiểm tra trên PostgreSQL 18.6, Windows x64. Chưa kiểm tra PostgreSQL 16, macOS hoặc trình duyệt live desktop/mobile. Test frontend là test hiện có của giao diện/mock, không thay cho nghiệm thu live end-to-end.
