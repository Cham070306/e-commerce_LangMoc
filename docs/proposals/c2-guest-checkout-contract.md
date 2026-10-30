# Đề xuất hợp đồng checkout khách vãng lai — Làng Mộc

> **MÔ PHỎNG / ĐỀ XUẤT CHỜ KHẢI-SƠN.** Không có endpoint nào dưới đây trong `docs/API.md`; frontend không gọi chúng ở chế độ live. Leader đã nhắc F08: không tự bật guest checkout.

## Điều kiện cần trước khi triển khai

- `orders.user_id` hiện `NOT NULL`; backend cần cho phép `NULL` có kiểm soát hoặc thiết kế bảng/quan hệ đơn khách riêng.
- Không dùng giỏ server theo tài khoản cho khách. Backend cần tính lại giá, tồn, phí giao và khuyến mãi từ danh sách món gửi lên.
- Vẫn dùng `Idempotency-Key`; cùng nội dung người nhận, điện thoại, địa chỉ, ghi chú và danh sách món phải trả lại cùng đơn, không trừ tồn lần hai.
- Chỉ được bật frontend sau khi leader phê duyệt và Khải/Sơn chốt schema/API.

## Endpoint đề xuất

| Mục đích | Method / path đề xuất | Request chính | Kết quả cần có |
|---|---|---|---|
| Xem trước giá khách | `POST /guest/checkout/preview` | `items: [{product_id, quantity}]`, người nhận/địa chỉ chuẩn nếu phí phụ thuộc nơi giao | snapshot giá, tồn, phí, tổng; không tin tổng do client gửi |
| Tạo đơn khách | `POST /guest/orders` + header `Idempotency-Key` | người nhận, số điện thoại, địa chỉ chuẩn hai cấp, ghi chú, `items` | mã đơn, thời gian, người nhận, món và tổng COD snapshot |
| Tra cứu đơn khách | `POST /guest/orders/lookup` | mã đơn + số điện thoại, giới hạn tần suất | chỉ trả dữ liệu tối thiểu của đúng đơn; không suy đoán route UI trước khi chốt |

## Quy tắc cần Sơn/Khải chốt

1. Cơ chế lưu đơn khách: `orders.user_id` nullable hay bảng/khóa định danh riêng; ràng buộc idempotency của đơn khách không thể dựa vào `user_id` nullable đơn thuần.
2. Preview và tạo đơn phải xác thực danh sách `{product_id, quantity}`, giá, tồn, phí giao ở server; không lấy tổng từ localStorage/client.
3. Mã giảm giá cho khách: MVP frontend đề xuất tắt và hiển thị “Đăng nhập để dùng mã giảm giá”; backend cần nêu rõ nếu sẽ cho phép sau này.
4. Chống spam: rate limit theo số điện thoại và IP/thiết bị theo chính sách backend, không công bố ngưỡng nội bộ; mock chỉ được mô phỏng lỗi thân thiện.
5. Đồng ý điều khoản: lưu thời điểm, phiên bản điều khoản và nguồn phiên phù hợp pháp lý sau khi nội dung chính sách được nhóm chốt.
6. Địa chỉ phải theo dữ liệu hành chính chuẩn hai cấp. Hiện C2 bị chặn vì schema bắt buộc `district` và chưa có bộ dữ liệu chuẩn trong `fix_note/data`.

## Phạm vi frontend hiện tại

`VITE_GUEST_CHECKOUT` mặc định tắt. Dù biến được đặt `true`, luồng guest chưa được nối vào UI/mock vì điều kiện địa chỉ chuẩn ở trên chưa được đáp ứng. Live luôn phải tắt; không được gọi các endpoint đề xuất này.
