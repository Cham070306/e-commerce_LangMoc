# Báo cáo Trạng Thái Tích Hợp C2 & Kế Hoạch Phối Hợp Nhóm

## Bổ sung C2 — địa chỉ, điều khoản và khách vãng lai

- **T1 — Số điện thoại:** Frontend và mock dùng cùng quy tắc `^0[235789][0-9]{8}$`: đúng 10 chữ số liền nhau, bắt đầu bằng `0`, tiếp theo là `2/3/5/7/8/9`. Đây là **ĐỀ XUẤT CHỜ KHẢI XÁC NHẬN** phía server vì có chặn số quốc tế và cần nhóm chốt để không chặn số hợp lệ ngoài phạm vi Việt Nam.
- **T2 — Địa chỉ hành chính:** Chưa nạp dữ liệu; cần bộ dữ liệu hai cấp tại `fix_note/data` và quyết định hợp đồng cho `district` đang `NOT NULL`. Khi được cung cấp, phải ghi nguồn, ngày cập nhật, giấy phép và kế hoạch cập nhật khi đơn vị hành chính thay đổi.
- **T3 — Xóa địa chỉ:** `DELETE /me/addresses/:id` là **ĐỀ XUẤT CHỜ KHẢI**, không có trong `docs/API.md`; chỉ mock được bật mặc định.
- **T4 — Đồng ý điều khoản:** UI-only; checkbox không tích sẵn mỗi lần mở Checkout, chặn đặt đơn đến khi đồng ý và không gửi trường mới vì hợp đồng chưa có. **ĐỀ XUẤT CHỜ SƠN:** lưu thời điểm và phiên bản điều khoản đã đồng ý. Các trang chính sách vẫn có mục “CẦN NHÓM CHỐT”, nên ô tích chỉ có giá trị pháp lý sau khi nội dung được chốt.
- **T5 — Khách vãng lai:** Leader F08 yêu cầu không tự bật. `VITE_GUEST_CHECKOUT` mặc định tắt và chỉ mô phỏng khi mock; live luôn tắt. Chờ leader cùng Khải/Sơn đổi schema/API vì `orders.user_id` đang `NOT NULL` và `POST /orders` lấy giỏ theo tài khoản.

### Câu hỏi mở bổ sung

1. Khải xác nhận hay điều chỉnh quy tắc số điện thoại Việt Nam 10 chữ số ở backend?
2. Khải/Sơn chốt hợp đồng địa chỉ hai cấp thế nào khi schema/API hiện bắt buộc `district`?
3. Leader có phê duyệt luồng khách vãng lai sau khi Khải/Sơn có hợp đồng backend chưa?

*Cập nhật lần cuối: Đợt Feedback Leader C2 — Commit 60516b2*

## 1. Phân loại Endpoint & Tính Năng

### Nhóm A: Sẵn sàng trên Live API (Tuân thủ docs/API.md)
- `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /me` (Chờ Khải)
- `GET /me/cart`, `POST /me/cart`, `PUT /me/cart/:id`, `DELETE /me/cart/:id` (Chờ Khải/Sơn)
- `POST /checkout/preview` (Chờ Sơn)
- `POST /orders`, `GET /me/orders`, `GET /me/orders/:id`, `POST /me/orders/:id/cancel` (Chờ Sơn)
- `GET /me/addresses`, `POST /me/addresses` (Chờ Khải)
- `POST /contact` (Chờ Sơn)
- `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `PUT /admin/orders/:id/shipment` (Chờ Sơn)
- `GET /admin/products`, `POST /admin/products`, `PATCH /admin/products/:id` (Chờ Sơn)
- `GET /admin/categories`, `POST /admin/categories`, `PATCH /admin/categories/:id` (Chờ Sơn)
- `GET /admin/reviews`, `PATCH /admin/reviews/:id` (Chờ Sơn)
- `GET /admin/contact`, `PATCH /admin/contact/:id` (Chờ Sơn)

### Nhóm B: Đang mô phỏng trên Mock (Đã hoàn thiện & kiểm thử)
- Toàn bộ hành vi nghiệp vụ của Nhóm A đã được mô phỏng 100% trong `frontend/mock/c2Mock.ts` và `frontend/mock/server.ts`, có cờ X-Lang-Moc-Data = mock và nhãn "MÔ PHỎNG".
- Đồng bộ sản phẩm, danh mục, tồn kho và đánh giá giữa Admin và Storefront trên cùng một bộ nhớ in-memory.
- Cơ chế Idempotency-Key retry trả về đúng đơn cũ.

### Nhóm C: Tính năng chưa làm hoặc chờ nhóm chốt
- **Quyền Admin Hủy đơn hàng**: Chưa làm nút hủy phía Admin (tránh mâu thuẫn chính sách, đã đổi câu giao diện thành "Chưa hỗ trợ hủy đơn từ trang quản trị").
- **Upload ảnh thật (`POST /admin/uploads/images`)**: Chờ API của Khải; hiện tại form tạo sản phẩm không ép nhập URL tay tin cậy.
- **Tìm kiếm / Lọc nâng cao ở Admin**: Giữ đúng contract API (`status`, `page`, `limit`).
- **Dashboard Admin / Seller Center / Thống kê doanh thu**: Nằm ngoài phạm vi C2 theo quyết định của Leader.

---

## 2. Danh sách Câu Hỏi & Điểm Cần Phối Hợp

1. **Gửi Khải (Auth / Catalog / Addresses):**
   - T1 đề xuất xác thực số Việt Nam bằng đúng 10 chữ số liền nhau theo mẫu `^0[235789][0-9]{8}$`; quy tắc này thay thế đề xuất cũ 8-15 chữ số có dấu phân cách. Nhờ Khải xác nhận backend, đặc biệt cách xử lý số quốc tế và các số hợp lệ ngoài phạm vi Việt Nam.
   - Khi nào có endpoint upload ảnh `POST /admin/uploads/images` để nối form tạo sản phẩm?

2. **Gửi Sơn (Orders / Shipments / Admin):**
   - Khi khách hàng gặp sự cố mạng (mất response) và gửi lại `POST /orders` với cùng `Idempotency-Key` khi giỏ hàng đã bị dọn rỗng trên DB, Backend Sơn có hỗ trợ trả về đơn cũ không? (Phía C2 Mock đã hỗ trợ tính năng này).
   - Thứ tự thao tác khi chuyển sang trạng thái `shipping`: Frontend C2 đang gọi lưu vận đơn `PUT /admin/orders/:id/shipment` trước, sau đó mới gọi đổi trạng thái `PATCH /admin/orders/:id/status`. Nhờ Sơn xác nhận luồng này phù hợp với DB trigger.

3. **Gửi Trâm (Storefront & Shared CSS):**
   - Đã bọc lập `.admin-sidebar .admin-nav` trong `c2.css` để không bị vỡ giao diện bởi rule `nav` trong `global.css`. `global.css` của Trâm được giữ nguyên vẹn.
   - Đã thêm hook đọc chung `demoReviews` trong `mock/server.ts` để khi Admin duyệt review, trang chi tiết sản phẩm của Trâm sẽ tự động hiển thị review đó ngay lập tức.
