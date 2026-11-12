# 002 - Báo giá checkout, transaction và chống tạo đơn lặp

Ngày: 11/11/2026. Người chuẩn bị: Sơn/C4.

**Trạng thái: đã hiện thực và kiểm thử trên nhánh C4; bổ sung API/schema chờ Khải và Quân xác nhận trước merge.**

## Bối cảnh

API v1 yêu cầu server tính giá, kiểm tồn và chống request lặp. Giá có thể đổi giữa preview và tạo đơn; giỏ đã bị xóa khi client retry sau mất response. Cần giữ lịch sử migration và tránh trừ tồn hai lần.

## Phương án trong nhánh

- Một connection PostgreSQL cho toàn transaction. Khóa giỏ theo user bằng advisory lock, khóa sản phẩm theo UUID và khóa mã giảm.
- Tìm đơn cũ theo user/key trước khi kiểm tra giỏ và báo giá. Cùng payload trả đơn cũ; khác payload trả 409.
- Preview trả `checkout_quote` HMAC hạn 5 phút, gắn user/địa chỉ/giỏ/giá/mã/tổng. Đơn mới phải gửi quote. Secret dùng chung giữa worker, lưu trong `.env` cá nhân.
- Migration mới `006_c4_transactions.sql` thêm fingerprint vào orders và bảng quota contact sau migrations 001–005 của develop; không sửa migration đã áp dụng.

## Lý do

Khóa DB giải quyết cạnh tranh giữa các connection/worker. Quote giúp server phát hiện giá thay đổi sau preview; fingerprint phân biệt retry với tái sử dụng key cho nội dung khác.

## Ảnh hưởng và điều kiện chấp nhận

- `checkout_quote` bắt buộc với đơn live mới là **thay đổi hợp đồng**; không thể xem việc đã sửa API.md là bằng chứng nhóm đã đồng ý.
- C2 đã chuyển field quote ở types/Checkout, nhưng mock hiện chưa trả/kiểm tra field này. Quân cần đồng bộ mock theo hợp đồng đã được duyệt; 60 test mock hiện có không chứng minh tương thích đầy đủ phần quote.
- Khải cần review số migration, việc áp dụng vào DB nhóm và giao thức khóa khi C3/script sửa cart trực tiếp. Chưa có bằng chứng đã gửi thông báo hay đã áp dụng vào DB nhóm.
- Chưa ghép luồng trình duyệt với auth/catalog/địa chỉ C3. Không merge trước review chéo.

Minh chứng: [log PostgreSQL](../evidence/checkout/backend-tests.txt), [ma trận kiểm thử](../testing/checkout.md).
