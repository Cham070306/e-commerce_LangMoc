# Nghiệm thu storefront C1

Ngày kiểm tra: 14/10/2026. Phạm vi: frontend và GET mock local. Chưa nghiệm thu backend thật.

| Tình huống | Kết quả / minh chứng |
|---|---|
| Tìm kiếm có/không dấu, giao danh mục | PASS: unit test; UI tìm `bat`, giá 10.000–200.000 trả 4 sản phẩm |
| Giá tăng/giảm, giá null | PASS: unit test; UI tăng dần 15.000 → 20.000 → 25.000 → 35.000 |
| Phân trang, tổng số | PASS: unit test và HTTP; 449 bản ghi, 12/trang, hai trang không trùng ID; nút Sau trên trình duyệt chuyển Trang 2 → Trang 3 / 38 |
| Khoảng giá đảo, page/limit/sort không hợp lệ | PASS: unit test; API HTTP 400 |
| GET categories/products/detail/reviews | PASS: `http-checks.txt`, response envelope và ID được đối chiếu |
| Giá cũ/mới | PASS: mẫu balo 420.000 → 310.000, `product-desktop.jpg` |
| Gallery và zoom | PASS: ảnh master, 6 thumbnail, dialog mở/đóng được |
| Thông số và nguồn gốc thiếu | PASS: chất liệu/kích thước từ nguồn; nguồn gốc chưa xác minh ghi rõ |
| Đánh giá | PASS: hai review demo, trung bình 4.5/5, nhãn minh họa; `reviews-desktop.jpg` |
| Empty, error, loading, 404 | PASS: UI lỗi 503, empty, loading 1.6s và 404 đã xác nhận; xem ảnh tương ứng trong thư mục này |
| Desktop/mobile | Kiểm tra ở viewport mặc định và 390 × 844; ảnh theo tên desktop/mobile; nút bộ lọc mobile mở được, không tràn ngang (clientWidth = scrollWidth = 375 khi viewport 390px, có thanh cuộn trình duyệt) |
| Build | `npm run build` thành công; TypeScript kiểm tra src |

Chạy lại các test chức năng bằng `node --experimental-strip-types --test frontend/tests/catalog.test.ts` từ gốc repo. GET mock có trong cả `npm run dev` và `npm run preview`. Với backend thật, chạy lại các trường hợp tương ứng bằng live mode trước khi đánh dấu tích hợp hoàn thành.

## Chạy kiểm tra HTTP

`python3 scripts/check_storefront_api.py http://127.0.0.1:5173` (dev) hoặc thay bằng cổng 4173 khi preview đang chạy. Cả hai đã PASS. Log build ở `build.txt`. Các ảnh gồm catalog/product desktop-mobile, filter-search-price, reviews-desktop, api-error, empty-state, loading-state, not-found và pagination.

PASS bổ sung: từ trang demo lỗi, liên kết “Về danh mục” xóa tham số lỗi và khôi phục 12 thẻ sản phẩm. Ảnh gallery dùng master thay cho compact, giữ watermark nguồn.

## Cập nhật phong cách và sửa ảnh

Đã xác minh 449 ảnh đại diện local, sửa 32 trường hợp ảnh trang trí bị chọn nhầm, và bổ sung test đường dẫn ảnh local/không dùng ảnh theme. Tổng 6 test chức năng và ảnh. Bản này dùng typography Cormorant Garamond / IBM Plex Serif, nền giấy và xanh lam đậm; có slider thủ công và reveal khi cuộn, hỗ trợ reduced motion. Ảnh catalog-editorial là bản xem trước trước khi sửa hết 32 ảnh nguồn, chưa đại diện cho nghiệm thu cuối cùng. Chưa có ảnh home-heritage và catalog-local-mobile của bản mới.

Kiểm tra tiếp ngày 15/10/2026: khởi động lại dev server cổng 5173; kiểm tra HTTP categories/products/detail/reviews, phân trang 12/449, tìm kiếm và HTTP 400/404/503 đều PASS; git diff --check sạch. Log trước đó ghi nhận 6/6 test và build thành công. Chưa thể kiểm tra trực quan/chụp ảnh bổ sung vì công cụ trình duyệt từ chối truy cập theo chính sách bảo mật; cần kiểm tra desktop/mobile của bản cuối khi truy cập được khôi phục.
