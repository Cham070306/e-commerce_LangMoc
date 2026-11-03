# Mua hàng không cần tài khoản — 02/11/2026

Theo yêu cầu người dùng, bật guest checkout mặc định cho cả mock/live. `VITE_GUEST_CHECKOUT=false` tắt luồng guest ở frontend. Backend đã bổ sung API thật, thay thế giới hạn chỉ mock trước đây trong các ghi chú C2 cũ.

## Cách dùng

Khách chưa đăng nhập → sản phẩm → Mua ngay / Thêm giỏ → checkout → nhập tên, số điện thoại 10 chữ số và địa chỉ → đồng ý chính sách → Đặt hàng COD. Giỏ khách lưu trên trình duyệt; server luôn tính lại giá/tồn và phí ship. Không hỗ trợ mã giảm giá khách. Có thể đăng nhập từ checkout nếu muốn sử dụng tài khoản.

Chạy `cd backend`, `npm run migrate` để áp dụng migration 005 trước khi chạy code mới. Không sửa migration 001. Database local 55432 đã áp dụng 005.

## API

- POST /api/v1/guest/checkout/preview: `{items:[{product_id,quantity}]}`; trả subtotal_vnd, discount_vnd=0, shipping_fee_vnd=30000, total_vnd. Tạo cookie HttpOnly `langmoc_guest` (SameSite=Lax, Secure theo config, path /api/v1/guest), DB chỉ lưu SHA-256 của token.
- POST /api/v1/guest/orders: header Idempotency-Key là UUID; cookie guest từ bước preview; body `{items,recipient_name,phone,address_line,note?}`. 201 cho đơn mới, 200 cho retry cùng nội dung; 409 nếu dùng lại key cho nội dung khác/hết hàng/sản phẩm ẩn. Payload giá tự gửi bị từ chối. Không có endpoint tra cứu công khai qua mã đơn/điện thoại.
- Đơn khách có user_id=NULL, guest_session_hash, request_fingerprint. Unique index phiên+key và advisory lock theo phiên bảo vệ request lặp; khóa các product theo ID trước khi kiểm/trừ tồn, tạo order và order_items cùng transaction. Không tạo user giả hay hạ quyền auth/admin hiện có.
- Giới hạn 5 đơn mới/phút theo phiên guest; retry được kiểm tra trước giới hạn. Đây là giới hạn theo cookie phiên, chưa phải biện pháp chống lạm dụng toàn site theo IP/thiết bị.
- Phí ship cố định 30.000 VND cho bản demo, không phải báo giá hãng vận chuyển. Tồn kho catalog vẫn là số demo đã khai báo.

## Kiểm chứng

38/38 test backend với PostgreSQL thật, 67/67 frontend đạt. Bổ sung ca: guest preview/tạo đơn, hai request cùng key chỉ tạo 1 đơn/trừ tồn 1 lần, key khác nội dung trả 409, giỏ rỗng/trùng, phone sai, payload giá giả, thiếu phiên, sản phẩm ẩn, hết hàng và hai khách tranh sản phẩm cuối.

Trình duyệt live đã đăng xuất tài khoản demo và dùng Mua ngay cho Tô Lượn. Đơn thử 25284b35-f3c2-48a9-95d4-68d7c0276b44, mã LM-20261102-92e1b06cfeb24d4f, 313.200 + 30.000 = 343.200 VND. Dùng dữ liệu kiểm thử trên hệ thống local; không gửi đơn cho bên vận chuyển. Giỏ về 0, trang thành công hiện chi tiết. Thông tin thành công lưu sessionStorage để reload được trong phiên trình duyệt; chưa có tra cứu đơn khách/email tự động. API giao dịch tài khoản và admin đơn thuộc phạm vi tích hợp C4 trước đây vẫn cần hoàn thiện riêng.

## Giao diện

Đổi theme trang liên hệ, đăng nhập, giỏ và nút checkout từ xanh sang kem–nâu gỗ. Giữ bố cục basic. Không thay theme trang chủ hoặc catalog.
