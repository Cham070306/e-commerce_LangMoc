# Làng Mộc — storefront bàn giao C1

## Trạng thái

Frontend React + Vite + TypeScript. Trang chủ giữ theme Ngà & caramel, footer espresso, header trong suốt trên banner. Catalog và Product đã triển khai riêng. GET mock chạy qua HTTP trên Vite dev và preview; backend thật chưa có trong repo, nên chưa xác nhận tích hợp với PostgreSQL/backend C3–C4.

## Chạy và kiểm tra

```sh
cd frontend
npm install
npm run dev
npm run build
node --experimental-strip-types --test tests/catalog.test.ts
```

Chạy test bằng Node 22.18+ hoặc Node 24+; môi trường đã dùng Node 26. `npm run preview` phục vụ bản build và API mock. Với hosting static thuần, cần backend thật hoặc host chạy middleware riêng: các endpoint mock không được nhúng vào bundle production.

## Route

- `/#/`: Home.
- `/#/catalog`: 449 sản phẩm tham khảo, 12 sản phẩm/trang.
- `/#/catalog?q=bat&min_price=10000&max_price=200000&sort=price_asc`: tìm không dấu + giá + sắp xếp.
- `/#/catalog?category=non-la`: 7 mẫu nón.
- `/#/catalog?category=may-tre-dan`: empty state vì bộ crawl chưa có nhóm này.
- `/#/product/balo-phoi-vai-theu-tay-h-mong-d51e21fd`: giá cũ/mới, nhiều ảnh, thông số, hai review minh họa.
- `/#/product/khong-ton-tai`: 404.
- `/?demo=error#/catalog`: HTTP 503 để kiểm tra UI lỗi; bấm “Về danh mục” hoặc bỏ `?demo=error` để phục hồi. Chỉ có hiệu lực khi mock.
- `/?demo=slow#/catalog`: loading 1.6 giây. Chỉ có hiệu lực khi mock.

## Component và bàn giao C2

- `components/layout/Header.tsx`, `Footer.tsx`: layout dùng chung. Header nhận `home` để chọn trong suốt/nền sáng.
- `components/catalog/ProductCard.tsx`: thẻ liên kết chi tiết, `Price`, `ProductImage`; xử lý ảnh lỗi, giá null và giá giảm.
- `components/catalog/FeaturedProducts.tsx`, `Reviews.tsx`: danh sách nổi bật, đánh giá có loading/empty/error và phân trang.
- `components/common/States.tsx`: Loading, ErrorState, Pagination; dùng lại cho các trang C2.
- `pages/Home.tsx`, `Catalog.tsx`, `Product.tsx`: mỗi trang một file.
- `lib/api.ts`: API client duy nhất, credentials include, lỗi theo error envelope. Không lưu token.
- `lib/useResource.ts`: hủy request cũ khi đổi bộ lọc/route, retry, không để response cũ ghi đè response mới.
- `features/catalog/query.ts`: tìm có/không dấu, khoảng giá, sort allowlist, phân trang; dùng cho mock và test.
- `mock/catalog.json`: 449 sản phẩm đã chuẩn hóa từ crawl. Review giả lập tách riêng, có `is_demo` và nhãn UI.
- `mock/server.ts`, `vite.config.ts`: GET categories/products/detail/reviews mock qua HTTP, trả đúng envelope, mã lỗi 400/404/503.

C2 dùng lại layout và API client; thêm route Auth/Cart/Checkout/Orders trong App.tsx. Chưa có hành vi thêm giỏ hoặc đặt hàng giả trên storefront; nút hiện tại dẫn đến trang nguồn và được ghi rõ.

## Ghép API thật

Copy `frontend/.env.example` thành `frontend/.env.local`; đặt `VITE_API_MODE=live`, `API_PROXY_TARGET` theo cổng backend, rồi khởi động lại Vite. Nếu dùng API origin riêng, đặt `VITE_API_BASE_URL` và cấu hình CORS/cookie tại backend. Live mode không tự fallback về mock khi API lỗi.

GET và trường dữ liệu được ghi ở `docs/API.md`. Quy tắc response: `{data}` hoặc `{data,meta}`; lỗi `{error:{code,message}}`. Giá nguyên VND hoặc null nếu nguồn không có giá. Mốc `newest` trong dữ liệu crawl dựa vào thời điểm thu thập; backend thật cần dùng ngày tạo sản phẩm. Nguồn gốc chỉ hiện khi nguồn công bố, không dùng địa chỉ cửa hàng làm làng nghề.

## Giới hạn dữ liệu cần nhóm xác minh

35 sản phẩm chưa có giá; 48 chưa có mô tả chữ; phần lớn nguồn gốc làng nghề chưa được xác minh. UI hiển thị trạng thái thiếu thông tin và trang nguồn, không tự bịa. Một số Maries có mô tả dạng ảnh, được hiển thị trong phần mô tả. Gallery ưu tiên ảnh master/full đã xuất hiện trong dữ liệu nguồn; ảnh bên ngoài có thể thay đổi hoặc chặn hotlink, có fallback.

Giá giảm là snapshot từ nguồn, không phải khuyến mại được backend xác thực tại thời điểm mua. Review mock được gắn nhãn minh họa, không dùng nhận xét hay đánh giá giả làm khách thật. Backend review thật chỉ trả `visible`; phần gửi/duyệt review thuộc C2/C4 và ngoài phạm vi C1 này.

Ảnh banner dùng bản tăng nét AI, ảnh gốc giữ trong repo; xem `image-enhancement.md`. Ảnh và mô tả bên ngoài cần kiểm duyệt quyền tái sử dụng trước khi công bố website.

## Nghiệm thu

Xem `docs/evidence/storefront/README.md` cho kết quả test và ảnh desktop/mobile. Không đánh dấu API backend thật đã hoàn thành khi chưa có backend để ghép.

## Điều chỉnh ảnh và phong cách theo Yên Lam

Ảnh đại diện của 449/449 sản phẩm đã được tải và xác minh giải mã bằng Pillow, giữ byte ảnh gốc trong `frontend/public/images/products/`. Mapping URL nguồn, kích thước và lỗi thử ảnh ở `data/catalog/image-cache.json`. Fixture ưu tiên đường dẫn local; ảnh phụ trong gallery vẫn có thể tham chiếu nguồn. Không loại sản phẩm nào trong lần kiểm tra này. Nếu manifest lần sau ghi ảnh không hợp lệ, bước prepare sẽ loại sản phẩm đó khỏi fixture và tính lại tổng danh mục; dữ liệu crawl gốc vẫn được giữ.

Khung thẻ cố định aspect-ratio 1/1.07 (mobile 1/1.14), object-fit cover, padding 4–5 px; gallery có zoom hiển thị ảnh đầy đủ. Nền giấy SVG tự tạo, mảng xanh lam #193B4C / #112C39, kem #F7F3E9, điểm nhấn đồng #A5754B. Tiêu đề Cormorant Garamond, đoạn kể chuyện IBM Plex Serif; menu/form/nhãn tiếp tục Be Vietnam Pro. Lấy cảm hứng từ nhịp nền và typography của Yên Lam, không copy hình trang trí hay thương hiệu.

Trang chủ có chuyển ảnh thủ công (không tự chạy), fade ảnh và reveal khi cuộn với IntersectionObserver. Tôn trọng prefers-reduced-motion. Catalog intro thêm cụm ảnh chồng lớp và phím tắt chất liệu, giảm khoảng trống.

Kiểm tra bổ sung phát hiện 32 URL khung trang trí Yên Lam đã được lấy nhầm làm ảnh sản phẩm; đã thay bằng img.wp-post-image từ HTML chi tiết. Một URL có dấu được mã hóa đúng trước khi tải lại. Kết quả cuối: 449 ảnh đại diện đúng vùng sản phẩm được cache, không cần loại bản ghi. Mapping sửa nguồn ở `data/catalog/image-source-repairs.json`.

## Trang chủ — bố cục duyệt ngày 15/10/2026

- Trình tự: hero có chuyển ảnh thủ công → giá trị → ô tìm kiếm + ba danh mục có dữ liệu → sản phẩm nổi bật theo danh mục → câu chuyện nghệ nhân → sản phẩm có giá giảm → ba câu chuyện làng nghề → lời kết và footer.
- Ô tìm kiếm chỉ có placeholder và kính lúp; label ẩn phục vụ trình đọc màn hình. Submit điều hướng đến Catalog với q đã encode, bỏ khoảng trắng thừa.
- Các nút chọn danh mục nổi bật dùng GET categories lấy ID thực, GET products limit=4 và category_id. Loading/error/retry/empty có xử lý; yêu cầu cũ bị abort khi đổi danh mục.
- Góc ưu đãi duyệt từng trang GET products (100/trang) đến khi chọn đủ bốn sản phẩm có sale_price_vnd < price_vnd hoặc hết dữ liệu. Không tự tạo giá giảm. Phạm vi GET mock; cần nghiệm thu lại live API khi backend sẵn sàng.
- Mỗi liên kết nghề gốm/nón/thổ cẩm mở danh mục tương ứng. Mây tre chưa có dữ liệu nên chưa đưa vào danh mục nổi bật trên Home.
- Desktop danh mục ba cột; mobile ba thẻ ngang xếp dọc, tìm kiếm co theo màn hình, tab sản phẩm tự xuống dòng. Giữ font Be Vietnam Pro cho thao tác, serif cho tiêu đề và xanh lam đậm/kem/nâu đồng.
- Build và sáu test hiện có đạt. Chưa xác nhận trực quan bản này: công cụ browser bị chặn bởi chính sách trong phiên làm việc.

Cập nhật giá demo theo yêu cầu người dùng: các sản phẩm thiếu giá nguồn được gán mức minh họa theo loại sản phẩm trong scripts/prepare_frontend_catalog.py, có price_is_demo=true và nhãn “Giá demo · chưa xác minh” trên thẻ và chi tiết. Đây là mức phục vụ giao diện, không phải định giá thị trường. Dữ liệu cào gốc không sửa; current_price_vnd trong mock dùng mức demo để lọc và sắp xếp khớp số hiển thị. Bỏ chiều cao tối thiểu tên sản phẩm, đưa giá sát tên hơn.
