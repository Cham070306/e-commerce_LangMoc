# Kế hoạch code Việt Craft cho nhóm 4 người

## Hiện trạng và quyết định chung

Ngày 11/10/2026, thư mục clone `e-commerce_vietcraft` chỉ có `.git`, nhánh `main` chưa có commit. Giao diện responsive mà nhóm đã làm chưa có trong thư mục này, nên phân công frontend dưới đây là theo **chức năng**, chưa gắn với tên file thật. Khi đưa giao diện vào repo, giữ lại layout hiện có và gắn API theo hợp đồng ở [API.md](API.md). Tài liệu này không lấy bảng CLOUDBOT UTH làm phân công Việt Craft.

Stack đã chốt: PostgreSQL. Đề xuất dùng TypeScript xuyên suốt; frontend React + Vite nếu giao diện hiện tại đã là React, backend Node.js + Express hoặc NestJS theo kỹ năng nhóm. **Không tạo frontend mới trước khi xác nhận giao diện hiện có dùng framework nào.** Mô hình đầu tiên có một tài khoản admin quản lý sản phẩm; bảng `sellers` chuẩn bị dữ liệu nguồn gốc, chưa có portal cho người bán. COD là phương thức đủ để chạy trọn luồng demo; gateway là phần mở rộng nếu thời gian cho phép.

## Cấu trúc thư mục khi nhập giao diện hiện có

```text
e-commerce_vietcraft/
  frontend/               # giao diện responsive hiện có, giữ framework gốc
    src/
      pages/              # Home, Catalog, Product, Cart, Checkout, Auth, Contact, Policies
      components/         # Header, ProductCard, Filters, Price, ReviewList...
      features/           # catalog, cart, auth, checkout, reviews
      lib/api.ts           # một nơi cấu hình base URL, cookie và xử lý lỗi
  backend/
    src/
      modules/            # auth, catalog, cart, orders, reviews, contact, admin
      db/                 # connection, queries, transaction helpers
      middleware/         # auth, validate, error handler
  database/
    001_initial.sql       # lược đồ PostgreSQL hiện tại
    002_seed.sql          # dữ liệu mẫu do nhóm tạo, không dùng dữ liệu thật của khách
  docs/
    API.md
    TEAM_PLAN.md
  .env.example            # tên biến môi trường, không có mật khẩu thật
  README.md               # hướng dẫn chạy cho Windows và macOS
```

Nếu giao diện là HTML/CSS/JS thuần, giữ nguyên cấu trúc thực tế thay vì ép sang React. Chỉ tạo `lib/api.js` và module theo trang; hợp đồng API không đổi. Nếu nhóm đã có frontend trong repo khác, copy bằng một PR riêng để tránh xung đột khi bốn người cùng làm.

## Thiết kế dữ liệu

Lược đồ thật ở [database/001_initial.sql](../database/001_initial.sql). Các bảng lõi: `users`, `categories`, `products`, `product_images`, `addresses`, `cart_items`, `promotions`, `orders`, `order_items`, `payment_attempts`, `shipments`, `reviews`, `contact_messages`. `sellers` lưu làng nghề/đơn vị sản xuất và để ngỏ mở rộng thành marketplace. Quan hệ chính: category 1–n products; product 1–n images; user 1–n addresses/orders; user n–n products qua cart_items; order 1–n order_items; product/user 1–n reviews. `order_items` lưu tên và giá sản phẩm tại lúc đặt để lịch sử đơn không đổi khi admin sửa sản phẩm.

Tiền lưu `bigint` theo VND, không dùng số thực. `products.stock_quantity` và tổng đơn được kiểm tra ở backend trong transaction. `password_hash` chỉ lưu hash. `payment_status` tách khỏi `orders.status`. Không commit file `.env`, dump chứa tài khoản thật hoặc ảnh có quyền riêng tư.

## Chia việc: mỗi người có đầu ra kiểm tra được

| Người | Phạm vi chính | File/module sở hữu | Bàn giao và cách nghiệm thu |
|---|---|---|---|
| 1 – Giao diện mua sắm | Nhập giao diện responsive; trang chủ, danh mục, tìm/lọc/sắp xếp, chi tiết, ảnh, giá cũ/mới, khuyến mại và đánh giá hiển thị | `frontend/src/pages/Home*`, `Catalog*`, `Product*`; `components/Product*`, `Filters*`, `Review*`; `features/catalog` | Desktop/mobile hoạt động; kết nối GET categories/products/reviews; tìm kiếm, lọc, sắp xếp đúng; ảnh và giá hiển thị nhất quán |
| 2 – Tài khoản, mua hàng và quản trị UI | Trang đăng ký/đăng nhập; giỏ, địa chỉ, checkout, lịch sử đơn; liên hệ, feedback, trang chính sách, Maps; màn hình admin dùng API của người 3 và 4 | `frontend/src/pages/Auth*`, `Cart*`, `Checkout*`, `Orders*`, `Contact*`, `Policies*`, `Admin*`; `features/auth`, `cart`, `checkout` | Luồng đăng nhập → thêm giỏ → đặt COD → xem đơn chạy được; form có trạng thái tải/lỗi; admin quản lý sản phẩm và đơn qua API; mobile không vỡ bố cục |
| 3 – Dữ liệu và API nền | PostgreSQL migration/seed; xác thực/phân quyền; API category/product/search/filter/sort; API admin danh mục và sản phẩm | `database/*`; `backend/src/modules/auth`, `catalog`; kết nối DB và middleware chung | Máy Windows/macOS chạy migration+seed; `/auth/me`, `/products` đúng hợp đồng; user thường không truy cập admin; có test cho auth, lọc/sắp xếp, dữ liệu mẫu |
| 4 – Giao dịch và quản trị API | API giỏ, preview, tạo đơn an toàn với tồn kho; khuyến mại, review, contact, admin đơn/review/feedback; test tích hợp | `backend/src/modules/cart`, `orders`, `reviews`, `contact`, `admin/orders` | Đặt COD một lần dù request lặp; trừ tồn đúng; admin xem/xử lý đơn, duyệt review, xem feedback; có bảng test và ảnh minh chứng |

Người 1 sau khi nối catalog hỗ trợ người 2 ở trang chính sách; người 3 sau khi hoàn thành auth/catalog hỗ trợ người 4 kiểm thử API giao dịch. Người 2 ưu tiên luồng mua hàng trước, rồi nối admin UI ở mốc M3; người 3 và 4 có thể dùng API client để test admin trước khi UI hoàn tất. Tên người được nhóm tự điền; tỷ lệ tham gia trong báo cáo tính theo đóng góp thực tế, không mặc định mỗi người 25%.

## Điểm giao nhau cần chốt trong ngày đầu

1. Người 1 đưa giao diện hiện có vào `frontend/` và ghi framework, lệnh chạy, route/trang đã có; cả nhóm review trước khi sửa sâu.
2. Cả nhóm xem [API.md](API.md) và chốt tên field. Người 3 tạo migration; người 4 review các bảng đơn, giá và tồn kho. Đây là thời điểm khóa hợp đồng v1.
3. Người 3 cung cấp dữ liệu seed gồm bốn nhóm sản phẩm làng nghề, ít nhất 12 sản phẩm có ảnh có quyền sử dụng và hai tài khoản demo (admin, customer). Mật khẩu demo tạo bằng script local/biến môi trường, không hardcode tài khoản thật.
4. Người 1 và 2 dùng mock response có **cùng shape** API thật trong lúc chờ backend. Không viết hai chuẩn JSON khác nhau.
5. Người 4 nối checkout và admin sau khi người 3 có auth/catalog. Một người phụ trách review PR, cập nhật README và chạy demo end-to-end mỗi lần ghép.

## Lịch làm gợi ý theo mốc, không giả định hạn nộp

| Mốc | Đầu ra | Điều kiện chuyển mốc |
|---|---|---|
| M0 – chốt thiết kế | Giao diện được đưa vào repo; API và schema được cả nhóm duyệt; chạy được PostgreSQL trên ít nhất một Windows và một macOS | `README.md`, `.env.example`, migration và seed chạy sạch |
| M1 – duyệt sản phẩm | Catalog, chi tiết, ảnh, tìm/lọc/sắp xếp, auth và admin thêm/sửa sản phẩm | Test các chức năng liên quan của thầy đạt trên desktop/mobile |
| M2 – giao dịch | Giỏ, địa chỉ, preview, mã giảm, đặt COD, lịch sử đơn, admin quản lý đơn | Tạo đơn trừ tồn một lần; giá/tổng do backend tính; lỗi hết hàng được hiển thị |
| M3 – hoàn thiện yêu cầu | Review/bình luận, contact/feedback, chính sách, Maps, responsive toàn site | Bảng đối chiếu tất cả 12 nhóm yêu cầu của thầy có test và ảnh |
| M4 – bàn giao | Demo, tài liệu cài đặt, source code, Word, slide, ZIP | Máy khác clone và chạy theo README; không lộ secret; báo cáo dùng ảnh từ bản thực |

## Quy trình Git nhóm

- `main` là nhánh chạy được. Mỗi người tạo nhánh theo việc: `feature/catalog-ui`, `feature/checkout-ui`, `feature/auth-catalog-api`, `feature/orders-admin`.
- Một PR có mô tả chức năng, API/DB thay đổi, ảnh desktop/mobile nếu sửa UI, bước test và giới hạn còn lại. Một người khác review trước khi merge.
- Chỉ người 3 sửa migration ban đầu; thay đổi schema sau M0 làm migration mới và báo người 4/nhóm frontend trước. Không sửa migration đã được mọi người chạy rồi.
- Dùng `.env.example` cho cấu hình; `.gitignore` bỏ `.env`, `node_modules`, file build, dữ liệu DB, upload phát sinh. Seed phải chạy lặp có kiểm soát hoặc có hướng dẫn reset database demo.
- Mỗi ngày ghép code và thử luồng ngắn. Trước buổi demo, thử bằng một máy **khác** máy phát triển chính.

## Ma trận yêu cầu bài học phần

| Yêu cầu thầy | Người chính | Minh chứng cần chụp / test |
|---|---|---|
| Tìm kiếm, lọc, sắp xếp | 1 + 3 | Từ khóa, danh mục, giá, thứ tự; trường hợp không có kết quả |
| Đăng nhập, đăng xuất | 2 + 3 | Đúng/sai, phiên hết, tài khoản thường bị chặn khỏi admin |
| Giỏ hàng, thanh toán | 2 + 4 | Thêm/sửa/xóa giỏ, checkout COD, đơn thành công và lỗi tồn kho |
| Ảnh sản phẩm, responsive | 1 | Trang chủ, danh mục, chi tiết trên desktop và mobile |
| Liên hệ, feedback | 2 + 4 | Form hợp lệ/không hợp lệ; admin thấy phản hồi |
| Khuyến mại, giá mới/cũ | 1 + 4 | Giá hiển thị và số tiền backend tính khi đặt hàng |
| Đổi trả, bảo hành, vận chuyển | 2 | Trang chính sách liên kết từ menu/footer |
| Google Maps | 2 | Bản đồ hiển thị địa điểm nhóm xác nhận |
| Đánh giá, bình luận | 1 + 4 | Gửi, duyệt, hiển thị, kiểm soát nội dung |
| Trang quản trị | 3 + 4 | Danh mục/sản phẩm/đơn/review/feedback; quyền truy cập |

## Cài PostgreSQL trên Windows và macOS

Cài PostgreSQL theo bản dành cho hệ điều hành từ trang chính thức. Mỗi người dùng cùng **major version** đã chốt trong nhóm (schema yêu cầu từ PostgreSQL 16), tạo role và database local riêng. Thay `vietcraft_dev`/`vietcraft_user` bằng tên nhóm chốt, đặt mật khẩu **trên máy cá nhân**, rồi chạy:

```sql
CREATE ROLE vietcraft_user WITH LOGIN PASSWORD '<local-password>';
CREATE DATABASE vietcraft_dev OWNER vietcraft_user;
```

Trong terminal có `psql` trên PATH, chạy `psql -U vietcraft_user -d vietcraft_dev -f database/001_initial.sql` từ gốc repo. Trên Windows, có thể dùng SQL Shell (psql) hoặc đường dẫn tới `psql.exe`; trên macOS dùng `psql` của gói đã cài. Chạy tiếp seed khi nhóm tạo xong. Backend dùng `DATABASE_URL` trong `.env`, ví dụ mẫu `postgresql://vietcraft_user:<local-password>@localhost:5432/vietcraft_dev`; không commit mật khẩu thật. Docker có thể là cách chạy thay thế, không bắt buộc mọi thành viên dùng Docker.

## Việc cần xác nhận khi có frontend thật

- Framework, router và cấu trúc asset hiện có; giữ hay đổi giao diện cần theo code thật.
- Hạn nộp và số buổi nhóm có thể làm để đổi mốc M0–M4 thành ngày cụ thể.
- Thanh toán COD là bản demo chính hay nhóm đã có tài khoản sandbox của cổng thanh toán.
- Địa điểm đưa lên Google Maps, thông tin liên hệ và chính sách được nhóm xác nhận.
- Có hay không giao diện nhà bán trong MVP; nếu có, cần bổ sung vai trò `seller`, phân quyền và quy trình duyệt trước khi code.
