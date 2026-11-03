> **Đã có bản sửa sau đánh giá:** xem [kết quả sửa và kiểm tra lại](docs/FIXES_2026-11-03.md). Báo cáo bên dưới lưu hiện trạng và lỗi tại thời điểm phát hiện.

# Kiểm thử và đánh giá Làng Mộc — 03/11/2026

## Kết luận hiện tại

Phần storefront và backend nền đã có khả năng chạy thực tế: build thành công, catalog live đầy đủ, test auth/session/phân quyền/địa chỉ/admin catalog đạt. Giao diện có phong cách nhất quán và nền tảng tốt để demo học phần. Tuy nhiên chưa thể xác nhận **tất cả tính năng ngoài phần Sơn đều hoàn tất**: còn lỗi responsive chính sách, chuyển hướng đăng nhập, dữ liệu địa chỉ chưa chuẩn hóa và một số thông tin/nội dung chưa hoàn thiện. Đã kiểm tra thêm UI customer/admin sau khi người dùng cho phép dùng hai tài khoản demo; đã xác nhận tạo/xóa địa chỉ, phân quyền UI, tạo/sửa/ẩn sản phẩm và tạo/sửa/tắt danh mục. Lượt kiểm tra bổ sung phát hiện thêm lỗi phân trang admin mobile và tổng tiền checkout mock bị cũ khi chuyển trang nhanh.

Không lấy số test đạt làm tỷ lệ hoàn thành dự án hoặc điểm đóng góp cá nhân. Báo cáo này phản ánh source local hiện tại, không khẳng định code đã được push lên GitHub.

## Phạm vi, môi trường và cách chạy

- Dự án: `e-commerce_LangMoc`, HEAD `86c6544` cùng các thay đổi local sẵn có. Không đánh giá bản sao `e-commerce_vietcraft`.
- Căn cứ: `docs/TEAM_PLAN.md`, `docs/KHAI_QUAN_HANDOVER.md`, code và kết quả chạy mới trong phiên này.
- Loại khỏi nghiệm thu: backend C4 của Sơn — giỏ/checkout/đơn/khuyến mại/review ghi/contact/admin giao dịch. Không chạy `backend/tests/guest.test.ts` và không nghiệm thu API giao dịch khách; guest live hiện có cũng không được dùng để suy ra C4 hoàn tất.
- Vẫn chạy toàn bộ test frontend, gồm logic mock mua hàng/admin do frontend sử dụng. Chúng chỉ chứng minh logic UI/mock trong các ca đã viết, không chứng minh backend C4.
- macOS, Node 26.8.1; PostgreSQL 14.24 có sẵn. README yêu cầu PostgreSQL 16+, vì vậy chưa xác nhận môi trường đúng phiên bản yêu cầu, Windows hoặc điện thoại vật lý.
- Database kiểm thử riêng `langmoc_audit`, cổng 55433, dữ liệu tại `/private/tmp/langmoc-audit-20261103-pg`. Không dùng hoặc sửa database cá nhân trên cổng 5432.
- Migration và seed trên database trống thành công. Nhập catalog thành công: 449 sản phẩm nguồn + 3 sản phẩm mây tre từ seed = 452 sản phẩm live.
- Frontend mock: http://127.0.0.1:5173 ; frontend live: http://127.0.0.1:5174 ; API: http://127.0.0.1:4000/api/v1 . Các tiến trình được giữ chạy để có thể tiếp tục kiểm thử.
- Không sửa source tính năng; chỉ tạo báo cáo/minh chứng và chạy build, test trên dữ liệu kiểm thử riêng.

## Kết quả kiểm tra tự động

| Kiểm tra | Kết quả mới | Giới hạn |
|---|---|---|
| Frontend `npm run build` | Đạt | TypeScript + Vite production build |
| Backend `npm run build` | Đạt | TypeScript build |
| Frontend `npm test` | 67/67, không skip | Logic/contract/mock, không phải 67 ca E2E trình duyệt |
| Backend auth + catalog | 34/34, không skip | HTTP thật + PostgreSQL riêng; không gồm guest/C4 |
| API công khai và chặn khách chưa có phiên | 22/22 | Bộ kiểm tra độc lập bổ sung, có giao nhau với test sẵn có |
| Đối chiếu catalog live | 449/449 sản phẩm nguồn khớp | Tổng live 452 do thêm seed mây tre |
| Ảnh catalog | 665 ảnh gallery + 274 ảnh nội dung khớp nguồn | Kiểm tra file local tồn tại; chưa kiểm tra mọi URL ảnh ngoài |

Backend 34 test bao phủ đăng ký, email trùng/sai, login đúng/sai, cookie HttpOnly, `/auth/me`, logout thu hồi session; khách bị 401, customer bị 403, admin tạo/sửa danh mục/sản phẩm, giá giảm sai, phân trang admin; tạo/xóa địa chỉ, quyền sở hữu, số điện thoại và xử lý nhiều địa chỉ mặc định đồng thời; catalog tìm không dấu, danh mục, giá, sort, phân trang, lỗi query, chi tiết và reviews GET.

API bổ sung kiểm tra tìm `nón`/`non`, từ khóa không có kết quả, tăng/giảm giá, khoảng giá, mây tre, query sai, sản phẩm không tồn tại, reviews và chặn truy cập không phiên. Chi tiết từng ca trong `docs/evidence/review-2026-11-03/public-api-checks.json`.

## Kiểm tra giao diện đã thao tác thật

| Nhóm tính năng | Đã kiểm tra | Nhận xét |
|---|---|---|
| Trang chủ | Mở mock và live, hiển thị nội dung, liên kết catalog | Chạy được; live có sản phẩm từ DB |
| Catalog desktop | Mở danh sách live; lọc mây tre | Đúng 3 sản phẩm mây tre |
| Catalog mobile | Menu mở/đóng, mở bộ lọc, chọn Nón lá, sort giá giảm | Đúng 7 sản phẩm; hai sản phẩm 1.320.000 đồng lên trước nhóm 1.155.000 đồng |
| Tìm kiếm rỗng | Từ khóa `zzzzkhongco` trên mock; xóa bộ lọc | Có thông báo không tìm thấy và đường quay về catalog |
| Chi tiết sản phẩm | Giỏ Mây Tre Đan, giá, thông số, sản phẩm liên quan, reviews rỗng | Tải dữ liệu live; mở/đóng ảnh phóng to được |
| Giỏ hàng | Giỏ rỗng live; thêm sản phẩm, tăng 1→2 và giảm 2→1 trên mock | Thao tác được; phát hiện preview checkout bị cũ khi giảm rồi chuyển nhanh |
| Đăng ký | Mở form và gửi rỗng trên mobile | Có lỗi tên, email, mật khẩu; chưa gửi tài khoản mới qua UI |
| Liên hệ | Form rỗng, địa chỉ, link Maps, iframe; gửi nội dung giả lập qua mock | Có thông báo gửi thành công và xóa nội dung; không gửi liên hệ live vì backend thuộc C4 |
| Chính sách | Mở shipping, returns, warranty; xem desktop/mobile | Route chạy nhưng phát hiện lỗi bố cục mobile và nội dung chưa khớp phạm vi |
| Guard admin/địa chỉ | Truy cập khi chưa có phiên | Bị đưa về login; phát hiện redirect lồng nhau |
| UI tài khoản/địa chỉ/admin sau login | Customer và admin login/logout; hồ sơ, tạo/xóa địa chỉ, tải lại; customer bị 403; admin tạo/sửa/ẩn sản phẩm, tạo/sửa/tắt danh mục | Các thao tác chính đạt; lỗi redirect và phân trang mobile ghi riêng bên dưới |
| Checkout, đơn | Thêm giỏ → checkout mock → đơn LM-20261103-0003 → lịch sử → chi tiết → hủy | Đơn 343.200 đồng, giỏ về 0, hủy thành công; phát hiện một ca preview bị cũ trước khi tải lại |
| Admin đơn/review/feedback | Test frontend/mock đã chạy | Chưa thao tác đầy đủ các màn này trong trình duyệt; chưa nghiệm thu API live C4 |

## Các vấn đề cần xử lý

### 1. P2 — Tiêu đề chính sách bị chồng chữ trên mobile

- Tái hiện: mở `/#/policies/warranty`, viewport 390×844. Tiêu đề dài xuống nhiều dòng, vượt phần khung tiêu đề và đè lên mục “1. Phạm vi bảo hành sản phẩm thủ công”.
- Ảnh: `docs/evidence/review-2026-11-03/mobile-policy.png`; desktop đối chiếu: `desktop-policy.png`.
- Vị trí: `frontend/src/pages/Policies.tsx:65` dùng thẻ `header` bên trong nội dung. CSS `header` toàn cục tại `frontend/src/styles/global.css` áp cả bố cục flex, chiều cao cố định và sticky cho thẻ này.
- Đề xuất: giới hạn CSS header trang vào `.site-header`; dùng class riêng cho header nội dung chính sách, cho phép chiều cao tự nhiên và xếp dọc trên mobile. Kiểm lại cả ba chính sách và bảng bảo hành sau sửa.

### 2. P2 — Redirect đăng nhập lồng hai lần ở bản dev

- Tái hiện khi chưa có phiên: mở `/#/admin/products` hoặc `/#/account/addresses`.
- Thực tế admin: `/#/login?redirect=%2Flogin%3Fredirect%3D%252Fadmin%252Fproducts`.
- Mong đợi: `/#/login?redirect=%2Fadmin%2Fproducts`.
- Vị trí: `frontend/src/features/auth/guards.tsx:14` và `:40`; effect đọc lại hash đã bị effect trước đổi. Code đang chạy dev có React StrictMode, nên cần làm chuyển hướng có thể chạy lặp mà không bọc lại login.
- `Login.tsx` cho phép redirect nội bộ `/login?...`, nên có nguy cơ quay lại trang login thay vì đích ban đầu. Đã kiểm chứng sau khi được phép dùng admin demo: đăng nhập thành công nhưng vẫn ở `/#/login?redirect=%2Fadmin%2Fproducts`, header đã hiện “Tài khoản của tôi”, thay vì vào admin. Ảnh `redirect-after-login.png`. Một lượt mở tab mới với redirect đơn vẫn vào sổ địa chỉ đúng; lỗi phụ thuộc cách mount/điều hướng trong bản dev. Chưa khẳng định tái hiện trên production.
- Đề xuất: giữ đích ban đầu, tránh redirect khi đã ở login, kiểm thử cả bản dev và production.

### 3. P2 theo tiêu chí T2 — Địa chỉ chưa có danh mục tỉnh/xã chuẩn

- Kiểm tra source: `frontend/src/pages/Account.tsx` vẫn dùng input văn bản cho province/district/ward; backend `addresses.service.ts:10–12` kiểm chuỗi bắt buộc/độ dài, chưa kiểm quan hệ tỉnh–xã.
- Điều này chưa đáp ứng tiêu chí chọn tỉnh/xã theo dữ liệu đã duyệt được ghi trong bàn giao Khải–Quân. Không tính đây là lỗi backend Sơn.
- Đề xuất: thống nhất bộ dữ liệu; chọn tỉnh đổi danh sách xã và xóa lựa chọn cũ; backend xác thực cặp ID hợp lệ. Đã mở form địa chỉ sau login và xác nhận các trường là ô văn bản. Validation thiếu trường hoạt động; tên/đường/điện thoại lưu và tải lại đúng qua adapter live.

### 4. P3 — Thông tin liên hệ và chính sách chưa hoàn thiện

- Hotline, email, giờ làm việc đang hiển thị “Đang cập nhật”. Trang chi tiết đơn mock lại hardcode `1900 6868` và giờ `8:00–20:00` tại `frontend/src/pages/OrderDetail.tsx:357`; cần dùng chung cấu hình đã được nhóm xác nhận. Địa chỉ và Maps đã có, nên không còn đúng nếu nhận xét Maps hoàn toàn chưa làm. Chưa xác minh vị trí ghim thực địa.
- Chính sách shipping nói ngoại tỉnh sẽ mở sau nhưng đồng thời đưa SLA ngoại tỉnh 3–5 ngày. Chính sách returns mô tả Mall/Shop Yêu thích, tự giải ngân seller, tải chứng từ và mã đổi trả ngược; chưa có bằng chứng các khả năng này tồn tại trong sản phẩm hiện tại.
- Đề xuất: nhóm chốt thông tin và biên tập chính sách theo đúng phạm vi demo. Đây là nhận xét tính nhất quán sản phẩm, không phải đánh giá pháp lý và không phải yêu cầu Sơn phải bổ sung toàn bộ các chức năng nêu trong văn bản.

### 5. P3 — Dữ liệu sản phẩm còn thiếu nhiều thông tin

- Trong 449 sản phẩm nguồn: 48 thiếu mô tả chữ, 236 thiếu SKU, 445 thiếu trường `origin`, 35 đánh dấu giá demo. Thiếu `origin` không có nghĩa mọi nguồn gốc thực tế đều sai; đó là trường chưa có dữ liệu.
- Mock có Gốm sứ 221, Thổ cẩm 221, Nón lá 7, Mây tre 0. Live có thêm 3 sản phẩm mây tre seed; cần ghi rõ khác biệt khi demo hai chế độ.
- Đề xuất: bổ sung thông tin trọng yếu cho bộ sản phẩm dùng trình diễn; giữ nhãn giá demo; không suy ra tồn kho demo 8 là tồn kho thật.
- Chi tiết số đếm: `docs/evidence/review-2026-11-03/catalog-quality.json`.

### 6. P3 — Tài liệu và lời dẫn demo cần đồng bộ

- README còn số lượng test cũ và đoạn “chưa làm” lẫn với các cập nhật mới bên dưới. Báo cáo main ngày 02/11 có nhiều nhận định trước khi tích hợp backend, không dùng nguyên trạng để mô tả bản local này.
- `Product.tsx:16` trong mock vẫn ghi “Chưa mở bán trên Làng Mộc” cạnh các nút mua. Nên dùng thông điệp rõ “mua thử/mô phỏng” để phù hợp demo.
- Đề xuất: cập nhật README theo trạng thái tích hợp hiện tại, phân biệt mock/live và các phần đang chờ API C4.

## Đánh giá tổng thể theo phạm vi

- **Storefront:** khá tốt để demo duyệt sản phẩm. Có bản sắc giao diện, catalog lớn, tìm/lọc/sort và chi tiết có dữ liệu live. Cần cải thiện độ đầy đủ thông tin sản phẩm và nhất quán mock/live.
- **Backend nền của Khải:** kết quả chạy tốt trong môi trường đã thử; xác thực, quyền, địa chỉ và CRUD catalog có test HTTP/PostgreSQL đạt. Cần xác minh PostgreSQL 16+, Windows và rà soát các ca ngoài test sẵn có trước khi nghiệm thu cuối.
- **Frontend C2 của Quân:** bộ test logic/mock đạt, form công khai có validation, menu/bộ lọc mobile dùng được. Các thao tác UI tài khoản/địa chỉ và quản trị catalog chính đã được kiểm tra sau login. Cần sửa chính sách/redirect/phân trang admin mobile/đồng bộ preview, hoàn thiện địa chỉ chuẩn và quản lý ảnh sản phẩm. Không kết luận API Sơn còn thiếu là lỗi cá nhân Quân.
- **Phần Sơn:** không chấm, không kết luận đạt/chưa đạt trong báo cáo này.

Ưu tiên tiếp theo: sửa redirect, tổng tiền preview và hai lỗi CSS mobile → hoàn thiện địa chỉ chuẩn/quản lý ảnh → chốt liên hệ/chính sách/tài liệu → kiểm tra lại các luồng sau sửa → xác minh môi trường PostgreSQL 16+/Windows. Kiểm thử giao dịch live toàn hệ thống là lượt nghiệm thu khác khi đưa phần Sơn vào phạm vi.

## Lượt bổ sung sau khi được phép dùng tài khoản demo

Người dùng đã cho phép dùng cả customer/admin local. Rào cản duyệt tự động trước đó đã được giải quyết; không còn chờ quyền đăng nhập.

- Customer: đăng nhập từ redirect đơn vào đúng sổ địa chỉ; hồ sơ đủ tên/email/phone. Tạo địa chỉ giả lập, tải lại vẫn còn địa chỉ và phiên, xóa được địa chỉ vừa tạo. Form chặn thiếu quận/xã/đường. Vào admin hiện 403. Đăng xuất thành công.
- Admin: login thành công; danh sách 452 sản phẩm trước test. Chặn giá giảm 120.000 khi giá gốc 100.000. Tạo sản phẩm giả lập giá 100.000/80.000; mở storefront thấy đúng giá và mô tả. Sửa tồn 10→7, mở lại bảng xác nhận 7. Ẩn sản phẩm thành công; API công khai trả 404.
- Danh mục: tạo mới, sửa tên, tắt thành công; API categories công khai không trả danh mục đã tắt.
- Đã dọn hai bản ghi sản phẩm/danh mục giả lập bằng điều kiện slug và tên chính xác trên database kiểm thử riêng; địa chỉ giả lập cũng đã xóa qua UI. Không thay đổi sản phẩm/danh mục gốc. Đã đăng xuất phiên admin cuối cùng.
- Mock: dùng phiên khách hàng demo có sẵn, thêm Tô Lượn vào giỏ, tăng/giảm số lượng, checkout chặn khi chưa chọn checkbox chính sách. Sau khi tải lại để giá đúng, chọn checkbox và tạo đơn mô phỏng LM-20261103-0003: 313.200 + 30.000 = 343.200 đồng, giỏ về 0. Đơn có trong lịch sử, mở chi tiết được và hủy thành công.
- Mock contact: gửi tên/email/nội dung giả lập qua server mock local, hiện thông báo thành công. Không gửi cho người thật hoặc API live C4.

### 7. P2 — Phân trang admin che nội dung trên mobile

- Tái hiện: login admin → `/#/admin/products` → viewport 390×844.
- Thực tế: khối màu nền lớn chứa Trước/1/2/38/Sau xếp dọc và nằm đè lên tiêu đề/bộ lọc. Ảnh `admin-mobile.png`.
- Đo DOM: nav phân trang `position:absolute`, `top:73px`, `flex-direction:column`, chiều cao 262px. CSS `nav` không giới hạn phạm vi trong media query tại `frontend/src/styles/global.css:5` áp kiểu menu vào `<nav class="pagination">` từ `frontend/src/components/common/States.tsx:3`. `AdminProducts.tsx:429` dùng component này.
- Đề xuất: giới hạn CSS menu vào `.site-header > nav`, hoặc reset đầy đủ position/top/padding/flex-direction/background cho pagination; kiểm lại storefront, admin và tiến trình checkout trên mobile.

### 8. P2 — Checkout mock hiển thị tổng cũ khi giảm số lượng rồi chuyển trang nhanh

- Tái hiện: Tô Lượn 313.200 đồng, giỏ có 1 món → tăng lên 2 → giảm về 1 và bấm “Tiếp tục thanh toán” ngay.
- Dòng hàng checkout hiển thị 1 × 313.200 = 313.200 nhưng tạm tính vẫn 626.400, tổng 656.400; sau các lượt đọc trạng thái tiếp theo vẫn còn sai. Tải lại checkout thì về tổng đúng 343.200.
- Minh chứng: `checkout-stale.png`, `checkout-stale-dom.txt` ghi đồng thời số lượng 1 và tổng 656.400.
- Source: `CartContext.tsx:303–345` cập nhật UI trước rồi debounce PUT 350ms. Checkout có state preview riêng (`Checkout.tsx:121–162`), nên preview có thể được lấy trước khi PUT hoàn tất và không được đồng bộ lại sau đó. Đây là giải thích từ source phù hợp ca quan sát, chưa có test tự động tái hiện race.
- Đề xuất: chờ toàn bộ cập nhật giỏ hoàn tất trước khi chuyển/preview; dùng một trạng thái preview nhất quán, bỏ response cũ; test thao tác nhanh và mạng chậm.
- Không kết luận đã thu sai tiền: `Checkout.tsx:284` có bước lấy preview mới và cảnh báo nếu tổng đổi trước khi tạo đơn. Đơn mô phỏng đã đặt trong lượt này dùng giá đúng sau reload. Không kiểm backend giao dịch Sơn.

### 9. Khoảng trống quản trị ảnh sản phẩm

- Form tạo/sửa sản phẩm không có chọn ảnh/upload hoặc quản lý gallery; chỉ ghi chú chờ API upload ở `AdminProducts.tsx:638`. Backend catalog hiện nhận `images` trong payload tạo/sửa.
- Sản phẩm tạo thành công qua UI có 0 ảnh, storefront hiển thị “Ảnh từ · 0 ảnh”, thiếu đơn vị nguồn/SKU. Ảnh minh chứng `admin-product-live.png`.
- CRUD tên/giá/tồn/trạng thái đạt; chưa nên coi quản trị nội dung sản phẩm đã đầy đủ. Cần chốt cách chọn/upload ảnh và nối UI vào cơ chế backend được nhóm thống nhất; không mặc định quy trách nhiệm cho Sơn.

## Giới hạn còn lại và minh chứng

Đã hoàn thành bộ test tự động có sẵn trong phạm vi và kiểm tra thêm các luồng UI chính nêu trong bảng. Chưa khẳng định đã duyệt mọi tổ hợp dữ liệu hoặc mọi thao tác của tất cả màn hình: admin giao dịch/review/feedback mới có bằng chứng test mock; in phiếu, mọi URL ảnh ngoài, thiết bị vật lý, Windows/PostgreSQL 16+ và tích hợp C4 chưa nghiệm thu.

Source chức năng không được sửa trong lượt đánh giá. Các lỗi ở trên vẫn cần xử lý và kiểm tra lại.

Minh chứng mới nằm tại `docs/evidence/review-2026-11-03/`: frontend/backend build, 67 test frontend, 34 test backend, migration/seed, import/đối chiếu catalog, 22 API checks, số liệu chất lượng dữ liệu, kiểm tra admin-public-consistency và ảnh desktop/mobile/live/mock.
