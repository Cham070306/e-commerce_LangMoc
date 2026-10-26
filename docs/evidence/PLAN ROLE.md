# Báo cáo Trạng thái Tích hợp C2 (Khách hàng, Giỏ hàng, Checkout, Admin)

Tài liệu này phục vụ đối soát giữa các thành viên: Quân (C2), Khải (C3), Sơn (C4) và các bạn phụ trách viết báo cáo học phần (Chương 3–4, 5–6, 7–8).

---

## 1. Bảng Trạng thái Endpoint C2

| Nhóm chức năng | Endpoint | Phương thức | Hợp đồng `docs/API.md` | Trạng thái Backend C3/C4 | Trạng thái Frontend C2 | Ghi chú kỹ thuật |
|---|---|:---:|:---:|:---:|:---:|---|
| **Xác thực (Auth)** | `/api/v1/auth/register` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Mock ở tầng mạng Vite middleware (`c2Mock.ts`), lưu bộ nhớ, hash/session an toàn |
| | `/api/v1/auth/login` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Trả cookie `vc_session`, hồ sơ user (không lộ pass) |
| | `/api/v1/auth/logout` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Xóa cookie phiên, HTTP 204 |
| | `/api/v1/auth/me` | `GET` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Kiểm tra cookie, trả 200 (nếu có session) hoặc 401 |
| **Sổ địa chỉ** | `/api/v1/me/addresses` | `GET` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Danh sách địa chỉ của user đang đăng nhập |
| | `/api/v1/me/addresses` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Thêm địa chỉ mới, HTTP 201 |
| *Địa chỉ (thiếu)* | `/api/v1/me/addresses/:id` | `PUT / DELETE` | ⚠️ **CHƯA CÓ** | ❌ Chưa có | ⏳ Chưa làm | docs/API.md v1 chưa quy định sửa/xóa địa chỉ. Đã báo Quân để trao đổi với Khải (C3) |
| **Giỏ hàng (M2)** | `/api/v1/me/cart` | `GET` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M2: Gộp giỏ localStorage -> Server khi login qua hàm thuần planCartMerge |
| | `/api/v1/me/cart/items/:id` | `PUT, DELETE` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Cập nhật số lượng kiểm tra tồn kho (409 CONFLICT), xóa món (204) |
| **Checkout (M3)** | `/api/v1/checkout/preview` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Tạm tính, phí ship, giảm giá (mã LANGMOC10 hợp lệ, HEHAN hết hạn 409, mã sai 404) |
| | `/api/v1/orders` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M3: Bắt buộc header `Idempotency-Key`, phương thức COD, kiểm tra tồn, snapshot đơn hàng, trừ tồn một lần, retry an toàn |
| **Đơn hàng (M4)** | `/api/v1/me/orders` | `GET` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M4: Phân trang `page,limit`, bộ lọc trạng thái `status` |
| | `/api/v1/me/orders/:id` | `GET` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M4: Chi tiết đơn hàng, snapshot, timeline stepper, chặn đơn user khác (404) |
| | `/api/v1/me/orders/:id/cancel`| `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M4: Hủy đơn khi `pending`, từ chối 409 khi đã giao/hủy, hoàn lại tồn kho |
| **Liên hệ & Chính sách (M5)** | `/api/v1/contact` | `POST` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M5: Gửi liên hệ công khai/đăng nhập, validate CSDL, rate limit mô phỏng |
| | `/content/policies` | `GET` | ⚠️ Bỏ theo docs | ❌ Bỏ | 🟢 TRANG TĨNH | Trang tĩnh theo docs/API.md dòng 82: shipping, returns, warranty (Bỏ bảo mật) |
| **Admin (M6)** | `/api/v1/admin/categories` | `GET, POST, PATCH` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M6: Danh sách, tạo với gợi ý slug, sửa slug, bật/tắt (không xóa), 409 khi trùng slug |
| | `/api/v1/admin/products` | `GET, POST, PATCH` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M6: Danh sách, tạo (không nhập url ảnh thủ công, validate giá/tồn, làng nghề/chất liệu), ẩn/hiện, đồng bộ storefront |
| | `/api/v1/admin/orders` | `GET, PATCH` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M6: Bảng 6 trạng thái, stepper 5 bước, lưu vận đơn (carrier 80, tracking 100), cập nhật vận đơn riêng, huy hiệu payment_status |
| | `/api/v1/admin/reviews` | `GET, PATCH` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M6: Duyệt hiển thị (`visible`), ẩn (`hidden`), văn bản thuần an toàn (NO XSS) |
| | `/api/v1/admin/contact` | `GET, PATCH` | ✅ Có | ❌ Chưa có code | 🟡 MÔ PHỎNG (Mock) | Đã xong M6: Hộp thư tiếp nhận từ form M5, đánh dấu `read` / `resolved`, văn bản thuần an toàn |

---

## 2. Tài khoản Demo kiểm thử (Chỉ có trong Mock, không commit secret)

1. **Khách hàng thường (Customer)**:
   - Email: `linh@example.com`
   - Mật khẩu: `MatKhau123@`
   - Vai trò: `customer`
   - Quyền hạn: Quản lý thông tin, xem & thêm địa chỉ, mua hàng, bị chặn khi vào `/admin` (403 FORBIDDEN).

2. **Quản trị viên (Admin)**:
   - Email: `admin@langmoc.example`
   - Mật khẩu: `AdminSecret123@`
   - Vai trò: `admin`
   - Quyền hạn: Quản trị đơn hàng, vận đơn, danh mục, sản phẩm/tồn kho, kiểm duyệt đánh giá, hộp thư hỗ trợ.

---

## 3. Các vấn đề cần nhóm thống nhất (Báo cáo C3 / C4)

1. **API Địa chỉ**: Hiện tài liệu `docs/API.md` chỉ có `GET /me/addresses` và `POST /me/addresses`. Chưa có API cập nhật (`PUT /me/addresses/:id`), xóa (`DELETE /me/addresses/:id`) hoặc đặt địa chỉ mặc định (`PATCH /me/addresses/:id/default`). Cần Khải (C3) xác nhận có bổ sung vào v2 hay giữ nguyên cho MVP.
2. **Cơ chế Giỏ hàng (Cart)**: Theo yêu cầu nghiệp vụ logic chặt chẽ, khách hàng **bắt buộc phải đăng nhập** tài khoản mới được phép thêm sản phẩm vào giỏ hàng và quản lý đơn hàng. Khách vãng lai khi bấm "Thêm vào giỏ hàng", "Mua ngay" hoặc vào `/cart` sẽ được điều hướng tới trang đăng nhập với tham số chuyển tiếp `redirect` quay lại đúng sản phẩm/giỏ sau khi đăng nhập thành công. Giỏ hàng lưu trữ và đồng bộ tập trung trên server (`/me/cart`).
3. **Nghiệm thu Mốc M3 (Checkout COD & Idempotency-Key)**: Các bài test tự động (`npm test`) hiện tại kiểm tra tính đúng đắn của logic **MÔ PHỎNG (Mock)** ở tầng mạng Vite middleware (`frontend/mock/c2Mock.ts`) và tiện ích dấu vân tay `Idempotency-Key` (`src/features/checkout/idempotency.ts`). Việc "đặt COD trừ tồn đúng một lần trong transaction" bằng backend thực tế và cơ sở dữ liệu PostgreSQL là tiêu chí nghiệm thu của Sơn (C4) và hiện **CHƯA ĐƯỢC KIỂM CHỨNG** do backend chưa hoàn thiện.
4. **Nghiệm thu Mốc M4 (Lịch sử, Chi tiết & Hủy đơn hàng)**: Đã hoàn thiện giao diện Quản lý đơn hàng (`/#/orders`), Chi tiết đơn hàng với Timeline Stepper (`/#/orders/:id`), luồng hủy đơn hàng an toàn với Modal xác nhận và hoàn tồn kho tự động. Toàn bộ test tự động (`npm test`) bao gồm các test cho M4 đã đạt 100%. Giao diện và API hủy đơn hoạt động đầy đủ trên Mock; việc "hoàn tồn trong một transaction trên cơ sở dữ liệu PostgreSQL" cần Sơn (C4) nghiệm thu khi backend hoàn thành.
5. **Nghiệm thu Mốc M5 (Liên hệ, Google Maps & Trang Chính sách)**:
   - **Liên hệ (`POST /contact`)**: Đã hoàn thiện form phía Frontend với validation chặt chẽ (name 120, email 255, subject 160, message NOT NULL), tự động điền khi đăng nhập, khóa gửi lặp bằng `useRef` + spinner, thông báo qua `aria-live`. Backend Mock đã lưu tin nhắn vào kho `demoContactMessages` (chuẩn bị sẵn cho Admin M6) và áp dụng cơ chế giới hạn tần suất gửi liên tiếp (**MÔ PHỎNG**).
   - **Chính sách (`/#/policies/*`)**: Là **TRANG TĨNH** phía Frontend (vận chuyển, đổi trả, bảo hành). Tuyệt đối không chứa chính sách bảo mật thông tin (ngoài phạm vi C2).
   - **Google Maps**: Đang cấu hình tập trung tại `src/config/site.ts` với trạng thái **`CHƯA_CHỐT`**, hiển thị placeholder trung tính, không bịa địa chỉ giả.
   - **Danh sách các mục "CẦN NHÓM CHỐT" còn lại**:
     - *Địa điểm Maps*: Cần nhóm chốt địa chỉ chính thức để cấu hình iframe Google Maps.
     - *Thông tin liên hệ*: Địa chỉ văn phòng, hotline, email chính thức, giờ làm việc (hiện để "Đang cập nhật").
     - *Chính sách vận chuyển*: SLA số ngày giao hàng dự kiến, quy tắc đồng kiểm chi tiết khi nhận COD.
     - *Chính sách đổi trả*: Số ngày tiếp nhận yêu cầu đổi trả, chi tiết quy trình bồi hoàn hàng gốm sứ vỡ, bên chịu phí vận chuyển hoàn trả, danh mục chứng từ bắt buộc.
     - *Chính sách bảo hành*: Thời hạn bảo hành cụ thể cho từng loại hàng thủ công mỹ nghệ.
6. **Nghiệm thu Mốc M6 (Khu vực Quản trị Admin)**:
   - Đã triển khai đầy đủ 5 phân hệ: Đơn hàng, Sản phẩm & tồn kho, Danh mục, Đánh giá, Hộp thư liên hệ tại `/#/admin`.
   - Bảo vệ nghiêm ngặt: `<RequireAdmin>` phía Frontend và kiểm tra vai trò admin (401/403) phía mock middleware.
   - Quy tắc nghiệp vụ chuẩn chỉnh:
     - 6 trạng thái đơn hàng, 5 bước stepper, chuyển đổi hợp lệ, không hủy đơn đã xác nhận.
     - Cập nhật vận đơn (`carrier <= 80`, `tracking_number <= 100`) trước khi sang shipping; hỗ trợ cập nhật vận đơn độc lập không đổi trạng thái.
     - Bỏ ô nhập tay URL ảnh sản phẩm (chờ API upload ảnh an toàn).
     - Bỏ nút xóa sản phẩm/danh mục: chỉ ẩn sản phẩm và tắt hoạt động danh mục.
     - Hiển thị văn bản thuần an toàn tuyệt đối (không `dangerouslySetInnerHTML`) cho review và contact.
     - Đồng bộ storefront tức thì qua in-memory sync mà không sửa đổi bất kỳ file storefront nào của Trâm.
   - Đã chuyển các câu hỏi kỹ thuật về backend/DB cho Sơn (C4) và Khải (C3) trong tài liệu `docs/evidence/c2-status.md`.

