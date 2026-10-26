# Hợp đồng API Việt Craft MVP

Tài liệu này là bản thống nhất trước khi code. Base URL: `/api/v1`; request/response JSON UTF-8; tiền là **số nguyên VND**, thời gian là ISO 8601 UTC, ID là UUID. Client không được tự gửi `total_vnd` hay trạng thái thanh toán làm nguồn sự thật. Các endpoint `/me` yêu cầu phiên đăng nhập; `/admin` yêu cầu vai trò `admin` được kiểm tra tại API. Phiên nên dùng cookie HttpOnly, Secure khi chạy HTTPS, SameSite phù hợp cấu hình triển khai; không lưu token trong localStorage. Cần thống nhất CSRF nếu frontend và API dùng cookie khác origin.

## Quy ước chung

| Tình huống | HTTP | JSON mẫu |
|---|---:|---|
| Thành công | 200/201 | `{ "data": { ... } }` |
| Danh sách | 200 | `{ "data": [ ... ], "meta": { "page": 1, "limit": 12, "total": 42 } }` |
| Lỗi dữ liệu | 400 | `{ "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ", "fields": { "email": "Email không hợp lệ" } } }` |
| Chưa đăng nhập | 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "Vui lòng đăng nhập" } }` |
| Thiếu quyền | 403 | `{ "error": { "code": "FORBIDDEN", "message": "Không có quyền" } }` |
| Không tìm thấy | 404 | `{ "error": { "code": "NOT_FOUND", "message": "Không tìm thấy dữ liệu" } }` |
| Xung đột (hết hàng, email trùng, mã hết lượt) | 409 | `{ "error": { "code": "CONFLICT", "message": "..." } }` |

Không đưa stack trace, password hash hay cấu hình bí mật vào response. Phân trang mặc định 12, tối đa 100. `sort` chỉ nhận giá trị cho phép, không đưa trực tiếp vào SQL. Tìm kiếm ban đầu ưu tiên tên sản phẩm; có thể mở rộng mô tả/nguồn gốc và cần kiểm tra kết quả với tiếng Việt có dấu, không dấu.

## Tài khoản

| Method | Path | Quyền | Request chính | Kết quả |
|---|---|---|---|---|
| POST | `/auth/register` | Công khai | `full_name,email,password,phone?` | 201, hồ sơ người dùng không có hash |
| POST | `/auth/login` | Công khai | `email,password` | 200, thiết lập cookie phiên và trả hồ sơ |
| POST | `/auth/logout` | Đã đăng nhập | Không có | 204, xóa phiên |
| GET | `/auth/me` | Đã đăng nhập | Không có | 200, `id,full_name,email,role` |
| GET | `/me/addresses` | Đã đăng nhập | Không có | Danh sách địa chỉ của chính người dùng |
| POST | `/me/addresses` | Đã đăng nhập | Tên, điện thoại, tỉnh/quận/phường, địa chỉ | 201 |

Mật khẩu được băm bằng thuật toán dành cho password, ví dụ Argon2id hoặc bcrypt; giới hạn thử đăng nhập liên tiếp. Việc tạo tài khoản admin dùng script nội bộ, không qua `register`.

## Danh mục và sản phẩm

| Method | Path | Quyền | Request chính | Kết quả |
|---|---|---|---|---|
| GET | `/categories` | Công khai | Không có | Danh mục đang bật |
| GET | `/products` | Công khai | `q,category_id,min_price,max_price,sort,page,limit` | Sản phẩm `active`, ảnh đại diện, giá đang áp dụng, phân trang |
| GET | `/products/:slug` | Công khai | Không có | Chi tiết, nhiều ảnh, thông tin làng nghề/nhà làm |
| GET | `/products/:id/reviews` | Công khai | `page,limit` | Chỉ review `visible`, điểm trung bình và số lượng |

`sort` MVP: `newest`, `price_asc`, `price_desc`, `name_asc`. Với `sale_price_vnd`, API trả cả `price_vnd` (giá gốc), `sale_price_vnd` và `current_price_vnd`. Chỉ dùng giá giảm khi trạng thái khuyến mại hợp lệ và trong khoảng thời gian; lúc checkout server tính lại.

## Giỏ hàng và đơn hàng

| Method | Path | Quyền | Request chính | Kết quả |
|---|---|---|---|---|
| GET | `/me/cart` | Đã đăng nhập | Không có | Items, giá hiển thị, tổng tạm tính |
| PUT | `/me/cart/items/:productId` | Đã đăng nhập | `{ "quantity": 2 }` | 200, item sau cập nhật; số lượng > 0 và không vượt tồn |
| DELETE | `/me/cart/items/:productId` | Đã đăng nhập | Không có | 204 |
| POST | `/checkout/preview` | Đã đăng nhập | `address_id,promotion_code?,payment_method` | Giá mới nhất, giảm giá, phí giao hàng, tổng, lỗi nếu hết hàng |
| POST | `/orders` | Đã đăng nhập | Header `Idempotency-Key`; body `address_id,promotion_code?,payment_method,note?` | 201, mã đơn, items và tiền snapshot |
| GET | `/me/orders` | Đã đăng nhập | `page,limit` | Danh sách đơn của bản thân |
| GET | `/me/orders/:id` | Đã đăng nhập | Không có | Đơn của bản thân, trạng thái đơn và thanh toán |
| POST | `/me/orders/:id/cancel` | Đã đăng nhập | Không có | Hủy khi đơn còn `pending`; hoàn tồn trong một transaction |

Ví dụ tạo đơn:

```http
POST /api/v1/orders
Idempotency-Key: 26a1c8fd-6b48-4b27-934c-46a09858fd19
Content-Type: application/json

{"address_id":"5af4b0b9-1374-4256-9abc-637019c5cfe5","promotion_code":"LANGMOC10","payment_method":"cod"}
```

```json
{"data":{"id":"...","order_number":"VC-20261011-0001","status":"pending","payment_status":"unpaid","subtotal_vnd":400000,"discount_vnd":40000,"shipping_fee_vnd":30000,"total_vnd":390000}}
```

Trong transaction tạo đơn: khóa các dòng sản phẩm cần mua, kiểm tra tồn và giá, kiểm tra khuyến mại, lưu snapshot `order_items`, trừ tồn, tăng lượt dùng mã và xóa giỏ. Retry cùng `Idempotency-Key` phải trả lại đơn cũ, không trừ tồn lần hai. Phí vận chuyển cần có quy tắc duy nhất ở backend; bản demo có thể dùng mức cố định và ghi rõ.

## Thanh toán và vận chuyển

MVP đề xuất COD hoạt động hoàn chỉnh. Chuyển khoản chỉ bật khi có quy trình xác nhận rõ; gateway chỉ bật khi có sandbox và webhook xác thực. `POST /payments/:orderId/initiate` (đã đăng nhập) tạo lần thử thanh toán nếu có gateway; `POST /payments/webhook/:provider` nhận thông báo của nhà cung cấp, xác thực chữ ký và xử lý idempotent. Browser redirect chỉ dùng để hiển thị trạng thái, không tự đánh dấu đã thanh toán. API admin cập nhật vận đơn ở phần quản trị bên dưới.

## Đánh giá, liên hệ và nội dung tĩnh

| Method | Path | Quyền | Request chính | Kết quả |
|---|---|---|---|---|
| POST | `/products/:id/reviews` | Đã đăng nhập | `rating` 1–5, `comment` | 201, trạng thái chờ duyệt; mỗi user/sản phẩm một review |
| POST | `/contact` | Công khai | `name,email,subject,message` | 201, lưu feedback/liên hệ; giới hạn tần suất |
| GET | `/content/policies` | Công khai | Không có | Chính sách đổi trả, bảo hành, vận chuyển nếu lưu DB; nếu trang tĩnh thì endpoint này bỏ |

Chỉ cho review từ khách đã có đơn `delivered` chứa sản phẩm là quy tắc khuyến nghị; nếu nhóm chọn cho mọi tài khoản đánh giá, ghi rõ trong báo cáo và cập nhật test. Google Maps hiển thị trên trang liên hệ bằng địa điểm thực tế được nhóm xác nhận, không cần API backend riêng.

## Quản trị

| Method | Path | Request chính | Kết quả |
|---|---|---|---|
| GET/POST | `/admin/categories` | Tạo/xem danh mục | 200/201 |
| PATCH | `/admin/categories/:id` | Sửa/tắt danh mục | 200 |
| GET/POST | `/admin/products` | Xem/tạo sản phẩm | 200/201 |
| PATCH | `/admin/products/:id` | Tên, mô tả, ảnh, giá, tồn, trạng thái | 200 |
| GET/POST | `/admin/promotions` | Xem/tạo mã khuyến mại | 200/201 |
| PATCH | `/admin/promotions/:id` | Chỉnh thời gian/trạng thái/lượt dùng tối đa | 200 |
| GET | `/admin/orders` | `status,page,limit` | Danh sách đơn |
| PATCH | `/admin/orders/:id/status` | `{ "status": "confirmed" }` | 200 nếu chuyển trạng thái hợp lệ |
| PATCH | `/admin/orders/:id/shipment` | `carrier,tracking_number` | 200 |
| GET/PATCH | `/admin/reviews`, `/admin/reviews/:id` | Duyệt/ẩn review | 200 |
| GET/PATCH | `/admin/contact`, `/admin/contact/:id` | Xem/xử lý phản hồi | 200 |

Ảnh có thể lưu file trong thư mục upload hoặc object storage, DB chỉ giữ URL/đường dẫn. Nếu thêm upload API: `POST /admin/uploads/images`, multipart, kiểm tra MIME, kích thước và quyền trước khi lưu. Không để người dùng gửi URL tùy ý rồi coi là ảnh tin cậy.

## Quy tắc trạng thái và kiểm thử hợp đồng

- Đơn: `pending → confirmed → packing → shipping → delivered`; có thể chuyển `pending → cancelled`. Không cho client tự chọn trạng thái.
- Thanh toán: COD giữ `unpaid` tới khi giao/đối soát; gateway chỉ đổi `paid` khi nhận callback hợp lệ. Trạng thái thanh toán độc lập với trạng thái giao hàng.
- Giá hiển thị cần khớp giữa trang sản phẩm, giỏ, preview và đơn; khi giá đổi giữa lúc mua, preview/checkout báo thay đổi và yêu cầu xác nhận lại.
- API phải có các ca kiểm thử: tìm không có kết quả, sắp xếp, tồn kho cạnh tranh, mã giảm hết hạn/hết lượt, lặp request tạo đơn, người dùng xem đơn của người khác, khách truy cập admin, callback thanh toán lặp và bình luận chứa HTML/script.

Nguồn yêu cầu: `TMDT_CASE STUDY.pdf`; định hướng kinh doanh: `Nhóm 1 - Kế Hoạch Kinh Doanh.pdf`. API này là **bản thiết kế**, chưa phải mô tả code đã chạy.

## Storefront C1 — shape triển khai để ghép frontend

GET mock sử dụng base `/api/v1`, có trên Vite dev/preview; không thay backend C3/C4. Mock tắt bằng `VITE_API_MODE=live`.

- Category: `id, name, slug, product_count`.
- Product: `id, slug, name, category_id, category_name, sku, price_vnd, sale_price_vnd, current_price_vnd, images:[{url,alt,sort_order}], description, attributes, origin, source_name, source_url, collected_at, is_demo`. Giá có thể null trong dữ liệu crawl thiếu giá; không biến null thành 0. Slug duy nhất, có hậu tố UUID ngắn.
- Review: `id, rating, author_name, body, created_at, status, is_demo`. GET review trả `{data,meta,summary:{average_rating,review_count},is_demo?}`; trung bình null nếu chưa có review. Backend chỉ trả review visible.
- Tham số product và sort giữ như bảng trên. Giá chưa rõ bị loại khi có điều kiện khoảng giá, xếp cuối khi sort theo giá. Mặc định page=1, limit=12, giới hạn 100.

Dữ liệu mock review có nhãn rõ và không được dùng làm review khách thật. Các trường bổ sung nguồn giúp kiểm duyệt dữ liệu; backend có thể map seller/làng nghề thật vào shape này sau khi nhóm xác nhận. Không gán tồn kho hay trạng thái mua được nếu chưa có backend.
