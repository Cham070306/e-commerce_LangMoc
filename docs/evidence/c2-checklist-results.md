# Bảng Đánh Giá & Kết Quả Kiểm Thử Checklist C2 (Q-T01 – Q-T23)

Tài liệu kiểm thử nghiệm thu thực tế dựa trên `Feedback_rieng_cho_Quan.md` (Mục 10) tại commit cục bộ `60516b2` trên nhánh `fix/feedback-leader-c2`.

| Mã ca | Nội dung kiểm tra | Tình trạng | Môi trường | Bằng chứng | Ghi chú |
|---|---|---|---|---|---|
| **C2-T1** | Số điện thoại: rỗng, chữ, khoảng trắng, 9/11 số, dấu phân cách, `+84`, đầu `01`; chấp nhận `0901234567` và `02xxxxxxxx` hợp lệ |  |  |  |  |
| **C2-T2** | Chọn tỉnh rồi mới chọn xã; đổi tỉnh xóa xã; chặn cặp không thuộc dữ liệu chuẩn; cảnh báo địa chỉ cũ |  |  |  |  |
| **C2-T3** | Xóa địa chỉ thường/đang chọn/cuối cùng; từ chối địa chỉ người khác; đơn cũ giữ snapshot |  |  |  |  |
| **C2-T4** | Mặc định chưa đồng ý; tích/mở tích; Enter bị chặn; liên kết mở tab mới không đổi checkbox |  |  |  |  |
| **C2-T5a** | Cờ tắt: khách vào checkout vẫn chuyển đăng nhập |  |  |  |  |
| **C2-T5b** | Mock+cờ bật: khách đặt COD, double-click, lỗi phone/địa chỉ/điều khoản, reload thành công, đăng nhập giữa chừng |  |  |  |  |
| **Q-T01** | Bố cục form Checkout, Input, Label, Textarea font/border đồng bộ | Đã chạy – như mong đợi | Mock trình duyệt / Node build | `c2.css`, `Checkout.tsx` | Đã gộp `.c2-input`, `.c2-form-input`, `.c2-label`, `.c2-form-label`, `.c2-textarea` chuẩn 44-48px. |
| **Q-T02** | Tiêu đề C2 và Admin không bị dính chữ (reset letter-spacing) | Đã chạy – như mong đợi | Mock trình duyệt (Chrome/Edge) | `c2.css` | Đã scoped `.c2-page-wrap h1`, `.admin-shell h1` với `letter-spacing: -0.01em`, `line-height: 1.25`. |
| **Q-T03** | Menu Admin Mobile & Backdrop trên viewport <=720px | Đã chạy – như mong đợi | Mock trình duyệt (Mobile 390px) | `c2.css`, `AdminLayout.tsx` | Reset selector `.admin-sidebar .admin-nav` tách biệt khỏi menu Storefront, nền `#241B14`. |
| **Q-T04** | Luồng Mua ngay -> Đăng nhập -> Checkout không bị về giỏ | Đã chạy – như mong đợi | Mock trình duyệt / Unit test | `Checkout.tsx`, `Login.tsx` | Chờ `!authLoading && !cartLoading && items.length === 0` trước khi redirect giỏ. |
| **Q-T05** | Xác thực số điện thoại theo hợp đồng varchar(20) | Đã chạy – như mong đợi | Unit test / Mock | `f01_f07.test.ts` (Pass) | Hàm thuần `validatePhone()`, chặn "abc", rỗng, quá 20 ký tự, dấu + sai vị trí. |
| **Q-T06** | Trạng thái packing (Đang đóng gói) hiển thị ở cả khách và admin | Đã chạy – như mong đợi | Unit test / Mock trình duyệt | `f01_f07.test.ts`, `Orders.tsx` | Bảng trạng thái chuẩn 6 bước, có badge màu hổ phách và tab lọc "Đang đóng gói". |
| **Q-T07** | Hiển thị tách biệt tên người nhận và SĐT, không dùng snapshot | Đã chạy – như mong đợi | Mock trình duyệt | `Orders.tsx`, `AdminOrders.tsx` | Tách 2 dòng riêng biệt, đổi "snapshot" thành "thông tin lưu lúc đặt hàng". |
| **Q-T08** | Thanh tiến trình 3 bước Checkout | Đã chạy – như mong đợi | Mock trình duyệt | `CheckoutProgressBar.tsx` | Có mặt trên Cart, Checkout và OrderSuccess; quay lại không làm mất giỏ. |
| **Q-T09** | Bố cục Checkout 2 cột Desktop / 1 cột Mobile | Đã chạy – như mong đợi | Mock trình duyệt (Desktop & 390px) | `Checkout.tsx` | Trái ~65%, phải ~35% sticky summary. Nút "Đặt hàng COD — [tổng tiền]" rõ ràng. |
| **Q-T10** | Tạo đơn hàng COD thành công với Idempotency-Key | Đã chạy – như mong đợi | Mock API / Unit test | `checkout.test.ts` (Pass) | Trả mã `LM-`, trừ tồn kho 1 lần, dọn giỏ sạch sẽ. Cần Sơn nghiệm thu live API. |
| **Q-T11** | Retry cùng Idempotency-Key không sinh đơn hàng thứ 2 | Đã chạy – như mong đợi | Mock API / Unit test | `checkout.test.ts` (Pass) | Trả lại đơn cũ đã tạo, không trừ tồn kho lần 2. |
| **Q-T12** | Trang OrderSuccess hiển thị đầy đủ thông tin đơn hàng | Đã chạy – như mong đợi | Mock trình duyệt | `OrderSuccess.tsx` | Lưu snapshot vào sessionStorage để reload không bị lỗi giỏ hàng rỗng. |
| **Q-T13** | Admin menu phân nhóm rõ ràng (Bán hàng, Danh mục, Tương tác) | Đã chạy – như mong đợi | Mock trình duyệt | `AdminLayout.tsx` | Nhóm chức năng tách biệt, có `aria-current="page"`, không có route chết. |
| **Q-T14** | Admin đổi trạng thái đơn hàng tuân thủ state machine | Đã chạy – như mong đợi | Mock API / Unit test | `admin.test.ts` (Pass) | Chỉ cho phép chuyển bước hợp lệ, chặn nhảy cóc. |
| **Q-T15** | Admin lưu vận đơn trước khi chuyển sang shipping | Đã chạy – như mong đợi | Mock API / Unit test | `admin.test.ts` (Pass) | Gọi endpoint shipment trước, lưu thành công mới đổi trạng thái. |
| **Q-T16** | Đồng bộ sản phẩm admin tạo/sửa sang Storefront | Đã chạy – như mong đợi | Unit test / Mock | `dot_b_mock_sync.test.ts` | Tạo sản phẩm mới lập tức xuất hiện ở GET `/products` và GET `/products/:slug`. |
| **Q-T17** | Sản phẩm hidden không thể thêm vào giỏ hàng | Đã chạy – như mong đợi | Mock API / Unit test | `c2Mock.ts`, `server.ts` | Trả 404 NOT_FOUND khi cố tình thêm vào giỏ. |
| **Q-T18** | Danh mục is_active = false chặn thêm vào giỏ | Đã chạy – như mong đợi | Mock API / Unit test | `c2Mock.ts` | Trả 409 CONFLICT báo danh mục tạm ngưng hoạt động. |
| **Q-T19** | Nguồn tồn kho duy nhất cập nhật sau đặt/hủy đơn | Đã chạy – như mong đợi | Mock API / Unit test | `cart.test.ts`, `orders.test.ts` | Dùng chung `demoStockMap`. |
| **Q-T20** | Validate toàn bộ payload PATCH sản phẩm (Atomic) | Đã chạy – như mong đợi | Unit test | `dot_b_mock_sync.test.ts` | Bất kỳ trường nào sai định dạng thì hủy toàn bộ, không sửa dữ liệu dở dang. |
| **Q-T21** | Seed review trỏ đúng ID sản phẩm có thật, chỉ duyệt mới hiện | Đã chạy – như mong đợi | Unit test / Mock | `dot_b_mock_sync.test.ts` | Chỉ review status === 'visible' mới xuất hiện trên trang chi tiết sản phẩm. |
| **Q-T22** | Kiểm thử trên thiết bị di động thật (iOS / Android) | Chưa chạy | Cần thiết bị thật | - | Chờ bạn Quân hoặc tester kiểm tra trên điện thoại vật lý thực tế. |
| **Q-T23** | Kiểm thử tích hợp Live API với Backend Sơn và Khải | Chưa chạy | Môi trường Live Backend | - | Đã sẵn sàng lớp gọi API chuẩn contract; chờ Khải và Sơn bật server live. |

