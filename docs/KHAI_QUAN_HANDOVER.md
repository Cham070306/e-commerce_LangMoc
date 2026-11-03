# Bổ sung phần Khải và Quân — 02/11/2026

Căn cứ phân công: https://docs.google.com/spreadsheets/d/1mQPVKzftE_wg-ZKazWq6vdGNnv2w71cvw6Z8rnlMeI4/edit?gid=0

## Phạm vi và kết quả

Khải: PostgreSQL, seed 4 danh mục/12 sản phẩm, auth/session, quyền admin, địa chỉ, catalog và admin danh mục/sản phẩm. Quân: tài khoản, giỏ/checkout/đơn, liên hệ/chính sách/Maps và admin UI. Tiêu chí nghiệm thu Quân yêu cầu API thật; mock thành công không đủ để đánh dấu hoàn thành.

Đã đưa backend Khải từ commit merge local 86c6544 vào repo Làng Mộc local (trước thay đổi main là 4723d9d). Chưa push GitHub.

Đã sửa:
- Đăng ký tạo session cookie thật, khớp hành vi UI. /auth/me trả cả phone để tải lại không mất số điện thoại.
- Adapter frontend đổi full_name/street_address sang recipient_name/address_line khi gọi địa chỉ live và chuyển ngược response/lỗi field.
- Số điện thoại backend thống nhất quy tắc 10 chữ số Việt Nam với UI; đăng ký UI thống nhất mật khẩu 8–128 ký tự.
- Khóa hàng users khi tạo/xóa địa chỉ để các request cùng tài khoản không tạo nhiều địa chỉ mặc định; xóa mặc định chọn địa chỉ còn lại trong transaction. Giữ kiểm tra quyền sở hữu.
- Backend admin trả đủ chất liệu, xuất xứ, seller, thời gian giảm giá và timestamps. UI giữ nguyên thời gian giảm giá khi sửa các trường khác.
- Admin GET products phân trang và kiểm tra page/limit/status/category_id, thứ tự ổn định.
- Proxy dev/preview dùng cổng backend 4000.
- Maps và địa chỉ nhóm đã xác nhận: 57 Bàu Cát 6, Phường Tân Bình, TP.HCM (Phường 14, Quận Tân Bình cũ). Có cấu hình ghi đè từ env; hotline/email/giờ làm việc chưa có nên để trống.
- Bỏ thông báo sai về endpoint địa chỉ và thông báo checkout chưa tồn tại; footer phân biệt mock/live.
- npm test frontend chạy toàn bộ file, không bỏ sót test. Sửa test backend dừng server đúng và chạy tuần tự để không xóa dữ liệu của suite khác.

## Kiểm chứng

- Frontend: build đạt; 67/67 test đạt.
- Backend: build đạt; 34/34 test API với PostgreSQL thật đạt; gồm session đăng ký, quyền, phone, địa chỉ không thuộc mình, request địa chỉ đồng thời và phân trang admin.
- Migration 001–003 và seed chạy trên database trống: 4 danh mục, 12 sản phẩm, 2 tài khoản.
- Trình duyệt live: đăng nhập customer, tải catalog từ DB, mở sổ địa chỉ hiển thị đúng tên/đường/số điện thoại; trang liên hệ hiển thị địa chỉ và liên kết Maps đúng truy vấn.
- Log: docs/evidence/khai-quan-2026-11-02/{backend-tests,frontend-tests}.txt.
- Máy kiểm thử: macOS, Node 26.8.1, PostgreSQL 14.24 sẵn có. Chưa nghiệm thu Windows hoặc PostgreSQL 16, chưa kiểm tra điện thoại vật lý. Không đánh dấu các môi trường này Pass.
- Maps đã cấu hình iframe theo truy vấn; chưa xác minh vị trí ghim thực địa. Bản đồ bên thứ ba phụ thuộc kết nối mạng.

## Chạy lại

Backend: cd backend, npm ci, copy .env.example thành .env, chỉnh DATABASE_URL, npm run migrate, npm run seed, npm run dev. API mặc định 4000.

Frontend mock: cd frontend, npm ci, npm run dev. Mặc định mock.

Frontend live: copy frontend/.env.example thành frontend/.env.local, đổi VITE_API_MODE=live, giữ API_PROXY_TARGET=http://127.0.0.1:4000, khởi động lại Vite. FRONTEND_ORIGIN backend phải trùng origin frontend. Các giá trị env public trong frontend không được chứa secret.

Phiên kiểm thử đang dùng PostgreSQL riêng trong /private/tmp/langmoc-review-pg trên cổng 55432, database langmoc_review; không sửa database cá nhân có sẵn. Bản mock chạy 5173; bản live chạy 5174.

## Việc còn lại theo đúng phân công

| Việc | Phụ trách/phụ thuộc | Điều kiện nghiệm thu |
|---|---|---|
| Kiểm thử PostgreSQL 16 và Windows | Khải | Migration/seed/test chạy trên máy và phiên bản đã chốt |
| Hoàn thiện API giỏ/preview/COD/đơn/khuyến mại/review ghi/contact/admin đơn-review-feedback | Sơn | API thật, transaction, chống lặp, phân quyền, test tồn kho |
| Nối và nghiệm thu toàn bộ checkout/admin giao dịch | Quân + Sơn | UI → API thật → DB → admin xử lý → khách xem đơn; dữ liệu còn sau restart |
| Địa chỉ tỉnh–xã chuẩn (yêu cầu T2 bổ sung) | Quân + Khải | Dùng bộ dữ liệu chính thức/đã duyệt, đổi tỉnh xóa xã, backend chặn cặp không hợp lệ; hiện còn nhập tự do |
| Hotline/email/giờ làm việc | Nhóm cung cấp | Điền thông tin thật và kiểm tra liên kết |
| Desktop/mobile và ảnh minh chứng | Quân | Kiểm tra thiết bị thật, loading/error/empty, cập nhật checklist, không tự đánh Pass |

Không có fallback âm thầm sang mock khi chạy live. Các endpoint thuộc Sơn chưa có sẽ báo lỗi; việc đó chưa được tính là đã hoàn thiện phần Quân.
