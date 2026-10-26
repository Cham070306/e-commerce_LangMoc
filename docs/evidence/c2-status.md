# Báo cáo Trạng thái Tích hợp C2 & Mốc 6 (Quản trị Admin)

*Cập nhật: 26/10/2026. Phục vụ nghiệm thu & bàn giao giữa Quân (C2), Khải (C3), Sơn (C4) và nhóm viết báo cáo học phần.*

---

## 1. Tổng quan Mốc 6 (Admin Area)

- **Đường dẫn**: `/#/admin` (các subroute: `#/admin/orders`, `#/admin/orders/:id`, `#/admin/products`, `#/admin/categories`, `#/admin/reviews`, `#/admin/contact`).
- **Kiến trúc Layout**: `AdminLayout` độc lập, hoàn toàn không chứa Header/Footer của storefront. Thiết kế thanh bên (Sidebar) màu gỗ thủ công mỹ nghệ `#241b14`, hỗ trợ menu drawer responsive cho thiết bị di động (< 900px) qua nút hamburger và backdrop mờ; thanh tiêu đề (Topbar) hiển thị thông tin tài khoản admin và nút Đăng xuất.
- **Phân quyền & Kiểm soát truy cập**:
  - Phía Frontend: Được bảo vệ bởi `<RequireAdmin>`, chặn người dùng chưa đăng nhập (điều hướng sang `#/login`) hoặc tài khoản `customer` (hiển thị trang từ chối quyền truy cập 403 `AdminAccessDenied` thân thiện).
  - Phía Mock Middleware: Mọi endpoint `/api/v1/admin/*` kiểm tra cookie phiên `vc_session`. Nếu chưa đăng nhập trả về HTTP `401 UNAUTHENTICATED`, nếu là tài khoản khách hàng thông thường trả về HTTP `403 FORBIDDEN`.
- **Tài khoản kiểm thử**: `user-admin-langmoc` (Email: `admin@langmoc.example` / Mật khẩu: `AdminSecret123@`, vai trò `admin`). Lưu ý: Thông tin này chỉ lưu trong mock kiểm thử nội bộ `mock/c2Mock.ts`, tuyệt đối không commit lên frontend hay tài liệu công khai.

---

## 2. Chi tiết 5 phân hệ Quản trị Mốc 6

### 2.1. Quản lý Đơn hàng (`#/admin/orders` và `#/admin/orders/:id`)
- **Bảng trạng thái đơn hàng (`orders.status`)**: Đầy đủ **6 giá trị** theo CSDL: `pending`, `confirmed`, `packing`, `shipping`, `delivered`, `cancelled`.
  - Nhãn hiển thị thuần tiếng Việt, thân thiện, không dùng từ sai thương hiệu ("xưởng"): Chờ xác nhận, Đã xác nhận, Đang đóng gói, Đang vận chuyển, Giao thành công, Đã hủy.
  - Stepper 5 bước trên chi tiết đơn hàng: Đặt hàng → Xác nhận → Đóng gói → Đang giao → Đã giao.
  - Các bước chuyển hợp lệ: `pending → confirmed → packing → shipping → delivered`; riêng hủy đơn chỉ cho phép `pending → cancelled`.
  - **Quy tắc bảo vệ**: Admin không thể hủy đơn hàng đã xác nhận trở đi.
- **Trạng thái thanh toán (`orders.payment_status`)**:
  - Gồm 5 giá trị: `unpaid`, `pending`, `paid`, `failed`, `refunded`, hoàn toàn độc lập với trạng thái giao hàng.
  - Chỉ hiển thị huy hiệu (badge), giao diện không có nút thao tác đổi `payment_status`, frontend không gửi trường này lên máy chủ.
  - Mock **KHÔNG** tự ý đổi `unpaid → paid` khi đơn hàng chuyển sang `delivered` (đối soát thuộc nghiệp vụ backend, chờ Sơn xác nhận).
  - Đối với đơn COD ở trạng thái `unpaid`, hiển thị nhãn: *"Chưa thanh toán (thanh toán khi nhận hàng)"*.
- **Quy trình chuyển sang trạng thái `shipping`**:
  - Thứ tự gọi API: Gửi `PATCH /admin/orders/:id/shipment` để lưu thông tin vận đơn trước, khi thành công mới gửi `PATCH /admin/orders/:id/status` với `status: 'shipping'`.
  - Nếu bất kỳ bước nào lỗi (kể cả lỗi xung đột 409): Hệ thống tự động tải lại dữ liệu đơn từ máy chủ, không đổi trạng thái trên giao diện và hiển thị thông báo lỗi chi tiết cho admin.
  - Giới hạn độ dài DB: `carrier` tối đa 80 ký tự, `tracking_number` tối đa 100 ký tự.
  - **Hỗ trợ cập nhật vận đơn riêng**: Cho phép admin sửa thông tin nhà xe / mã vận đơn mà không cần đổi trạng thái đơn hàng.
  - *Ghi chú kỹ thuật*: Thứ tự gọi API này là **giả định kỹ thuật** do tài liệu `docs/API.md` chưa quy định cụ thể; đã gửi ghi chú chờ Sơn (C4) xác nhận.

### 2.2. Quản lý Danh mục (`#/admin/categories`)
- **Danh sách & Bộ lọc**: Hiển thị bảng danh mục, số lượng sản phẩm, trạng thái hoạt động.
- **Tạo danh mục mới (`POST /admin/categories`)**:
  - Body: `{ name, slug, is_active }`.
  - Tự động gợi ý `slug` chuẩn SEO khi gõ tên (loại bỏ dấu tiếng Việt, ký tự đặc biệt) qua hàm tiện ích `slugify()`, đồng thời cho phép admin chỉnh sửa tay `slug`.
  - Validate: `name` tối đa 100 ký tự, `slug` tối đa 120 ký tự. Trùng `slug` trả lỗi 409 CONFLICT và hiển thị báo lỗi ngay dưới ô nhập slug.
- **Chỉnh sửa & Bật/Tắt hoạt động**:
  - Cập nhật thông tin qua modal, kiểm tra trùng slug loại trừ bản ghi hiện tại.
  - **Chính sách xóa**: **TUYỆT ĐỐI KHÔNG CÓ NÚT XÓA DANH MỤC**. Chỉ có thao tác Bật / Tắt hoạt động (`is_active = true / false`) kèm hộp thoại xác nhận.

### 2.3. Quản lý Sản phẩm & Tồn kho (`#/admin/products`)
- **Danh sách & Bộ lọc**: Lọc theo danh mục, lọc theo trạng thái (`draft`, `active`, `hidden`), phân trang 12 sản phẩm/trang.
- **Tạo sản phẩm mới (`POST /admin/products`)**:
  - Body: `{ category_id, name, slug, description, price_vnd, sale_price_vnd, stock_quantity, status, material, origin_province }` khớp các cột trong `database/001_initial.sql`.
  - Bổ sung 2 trường mang giá trị khác biệt cốt lõi của sàn thủ công mỹ nghệ Làng Mộc: `material` (chất liệu, tối đa 120 ký tự) và `origin_province` (tỉnh thành làng nghề xuất xứ, tối đa 100 ký tự).
  - **QUY TẮC AN TOÀN ẢNH**: **KHÔNG CÓ Ô NHẬP `image_url` BẰNG TAY** (tuân thủ nghiêm ngặt cảnh báo trong `docs/API.md`: không để người dùng gửi URL tùy ý làm ảnh tin cậy; ảnh thực tế thuộc bảng `product_images` riêng). Chức năng tải ảnh chỉ thực hiện khi có API upload (`POST /admin/uploads/images`). Do hiện tại chưa có API này, sản phẩm tạo mới tạm thời không đính kèm ảnh và ghi chú rõ ràng trạng thái.
  - Validate giá trị số: `price_vnd` số nguyên không âm, `sale_price_vnd` bắt buộc nhỏ hơn `price_vnd`, `stock_quantity` số nguyên không âm.
- **Chỉnh sửa & Trạng thái Ẩn/Hiện**:
  - Sửa thông tin giá bán, tồn kho, nội dung mô tả sản phẩm.
  - **Chính sách xóa**: **TUYỆT ĐỐI KHÔNG CÓ NÚT XÓA SẢN PHẨM**. Chỉ có thao tác Ẩn sản phẩm (`status = 'hidden'`) hoặc Hiện sản phẩm (`status = 'active'`).
- **Đồng bộ với Storefront (Mục 10)**:
  - Khi admin thêm mới sản phẩm, cập nhật giá, điều chỉnh tồn kho hoặc ẩn sản phẩm, mock middleware đồng bộ trực tiếp vào danh mục dữ liệu trong bộ nhớ (`catalog.products`).
  - Toàn bộ thay đổi phản ánh tức thì ra trang chủ, danh sách sản phẩm và chi tiết sản phẩm ngoài storefront.
  - **Mức độ can thiệp code**: Đạt mục tiêu tối ưu — **KHÔNG CHẠM VÀO BẤT KỲ FILE NÀO CỦA TRÂM** (0 dòng sửa ở storefront).

### 2.4. Kiểm duyệt Đánh giá Khách hàng (`#/admin/reviews`)
- **Danh sách**: Xem các đánh giá sản phẩm từ người dùng, lọc theo trạng thái (`all`, `pending`, `visible`, `hidden`).
- **Thao tác**: Duyệt hiển thị (`visible`) hoặc Ẩn đánh giá vi phạm (`hidden`) kèm hộp thoại xác nhận.
- **BẢO MẬT HIỂN THỊ**: **TUYỆT ĐỐI KHÔNG DÙNG `dangerouslySetInnerHTML`**. Nội dung bình luận của khách hàng được render dưới dạng văn bản thuần (`<span>{rev.comment}</span>`), ngăn chặn triệt để lỗ hổng XSS (Cross-Site Scripting).

### 2.5. Hộp thư Liên hệ & Hỗ trợ Khách hàng (`#/admin/contact`)
- **Danh sách**: Tiếp nhận và quản lý các thắc mắc, phản hồi gửi từ form liên hệ ngoài storefront (đã xây dựng ở Mốc 5). Lọc theo trạng thái (`all`, `new`, `read`, `resolved`).
- **Thao tác**: Đánh dấu "Đã xem" (`read`) hoặc "Đã xử lý" (`resolved`).
- **BẢO MẬT HIỂN THỊ**: **TUYỆT ĐỐI KHÔNG DÙNG `dangerouslySetInnerHTML`**, toàn bộ `name`, `subject`, `message` hiển thị dưới dạng văn bản an toàn.

---

## 3. Các điểm cần chuyển tiếp và xác nhận với các thành viên khác

### 3.1. Gửi Sơn (Backend - C4):
1. **Thứ tự gọi API Vận đơn & Trạng thái**:
   - Hiện tại Frontend admin đang thực hiện: gọi `PATCH /admin/orders/:id/shipment` trước, thành công mới gọi `PATCH /admin/orders/:id/status` với `status: 'shipping'`. Nếu một trong hai bước lỗi thì tải lại đơn từ server để đồng bộ và hiển thị thông báo lỗi rõ ràng.
   - Nhờ Sơn xác nhận backend có yêu cầu thứ tự nào khác không, hoặc có kế hoạch gộp thông tin vận đơn vào cùng payload đổi trạng thái hay không.
2. **Cơ chế cập nhật `payment_status` cho đơn COD**:
   - Theo tài liệu, đơn COD giữ trạng thái `payment_status: 'unpaid'` cho đến khi giao hàng và hoàn tất đối soát tiền mặt.
   - Khi shipper giao thành công và đơn chuyển sang `delivered`, backend có tự động chuyển `payment_status` sang `paid` hay cần một tiến trình đối soát riêng từ phía đơn vị vận chuyển?
3. **Quyền hủy đơn của Admin**:
   - Hệ thống hiện chỉ cho phép chuyển từ `pending → cancelled`. Một khi đơn đã sang `confirmed`, admin không thể hủy đơn trên giao diện (tránh xung đột với hàng đã chuẩn bị). Sơn xem quy tắc nghiệp vụ này đã khớp với backend chưa.

### 3.2. Gửi Khải (Thiết kế API & CSDL - C3):
1. **Body API tạo sản phẩm & danh mục**:
   - Frontend đã triển khai body tạo sản phẩm gồm: `{ category_id, name, slug, description, price_vnd, sale_price_vnd, stock_quantity, status, material, origin_province }`.
   - Trường `seller_id`: Do `database/001_initial.sql` có cột `seller_id`, nhờ Khải xác nhận khi admin tạo sản phẩm thì `seller_id` có bắt buộc không, hay mặc định lấy theo tài khoản admin hoặc `NULL`. Hiện tại Frontend không tự ý gửi `seller_id`.
2. **API Tải ảnh sản phẩm (`POST /admin/uploads/images`)**:
   - Tuân thủ quy định bảo mật của `docs/API.md`, Frontend không cho phép nhập URL ảnh thủ công. Khải xác nhận khi nào có endpoint upload ảnh chính thức để Frontend tích hợp component upload file đa ảnh (bảng `product_images`).
3. **Định dạng mã đơn hàng (`order_number`)**:
   - Mã đơn hàng là `varchar(30)` duy nhất. Mock đang phát sinh mã định dạng `LM-xxxxxx` đồng bộ với mốc M3.

---

## 4. Kết quả Kiểm thử & Biên dịch (Validation)

- **Biên dịch TypeScript & Vite**:
  - Lệnh: `npm run build`
  - Kết quả: **PASS (100%)** — `tsc -b && vite build` hoàn thành không có bất kỳ lỗi cú pháp hoặc kiểu dữ liệu nào (Exit code 0).
- **Kiểm thử tự động (Node.js Test Runner)**:
  - Lệnh: `npm test`
  - Kết quả: **PASS 43/43 tests (100%)**, bao gồm:
    - 5 bài test cart & merge (M2)
    - 6 bài test catalog & search
    - 8 bài test checkout, idempotency key & COD (M3)
    - 7 bài test orders history, detail & cancel (M4)
    - 9 bài test contact validation, rate limit & policies SLA (M5)
    - 8 bài test admin: access guard (401/403/200), order status transition table (6 statuses), shipment update validation, category CRUD & 409 conflict, product CRUD & prices validation & in-memory storefront sync, review moderation, contact moderation.
