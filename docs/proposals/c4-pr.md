# PR: C4 - Giao dịch PostgreSQL, tương tác và quản trị

Backend trước đây chỉ có cây thư mục; C2 chạy mock. Nhánh bổ sung handler HTTP và service PostgreSQL cho giỏ, preview/COD, lịch sử/hủy đơn, khuyến mại, review, contact, admin đơn/vận đơn/kiểm duyệt.

Tạo đơn khóa giỏ/sản phẩm/mã trong transaction; cùng user/key trả đơn cũ kể cả giỏ đã dọn. Snapshot giữ lịch sử giá. Quote HMAC chặn giá thay đổi sau preview. User/role/tổng tiền trong request không được tin cậy. C3 cung cấp pool và resolver phiên.

## Cần review

Hồ sơ decisions 001-003 ghi rõ phương án trong nhánh và trạng thái chưa được nhóm phê duyệt. Mock chưa trả/kiểm quote; thay đổi API cần thống nhất và đồng bộ trước merge.

- Migration mới 002: fingerprint orders, quota contact; giữ 001. Khải kiểm số migration trước merge.
- Hợp đồng checkout_quote; frontend chỉ thêm field optional ở types và chuyển quote vào payload, không sửa layout.
- MVP: ship demo 30.000 VND; hủy không trả lượt mã; tài khoản hoạt động gửi review chờ duyệt; COD delivered vẫn unpaid tới đối soát.
- C3 tiếp tục sở hữu auth/catalog/addresses, admin sản phẩm/danh mục. Không bật guest/gateway.

## Validation

Unit + PostgreSQL integration: `docs/evidence/checkout/backend-tests.txt`. Có 8 request đồng thời cùng key, hai khách mua món cuối, mã một lượt, rollback lỗi DB, ownership/admin, review/contact và HTTP. PostgreSQL thử nghiệm 18.6, Node 24, Windows x64. Frontend 60 test, TypeScript và build đạt.

Chưa nghiệm thu auth C3 + frontend live, PostgreSQL major nhóm chọn, macOS/máy thứ hai và ảnh desktop/mobile. Cần review chéo trước merge. Đây là mô tả PR cục bộ; chưa mở/gửi PR GitHub.
