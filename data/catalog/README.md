# Làng Mộc — snapshot dữ liệu sản phẩm

Nguồn do người dùng chỉ định: Gốm sứ Yên Lam, Tiệm Gốm Việt, Maries (tag nón lá), Craft Link (danh mục túi thổ cẩm), Khăn Minh Phong (vải thổ cẩm dân tộc), Balothocam.com.

- `products.json`: bộ dữ liệu tổng hợp, giá VND nguyên hoặc null; ID UUID ổn định theo URL nguồn.
- `products.csv`: bản dễ kiểm duyệt bằng Excel, UTF-8 BOM.
- `<source>.json`: dữ liệu và báo cáo riêng từng nguồn, gồm lỗi và giới hạn thu thập.
- `quality-report.json`: số lượng, tỷ lệ có ảnh/giá/mô tả và các cờ cần kiểm duyệt.
- `raw/`: HTML nguồn và robots.txt dùng để đối chiếu offline, không dùng trực tiếp làm nội dung UI.

## Phạm vi

Thu thập một lần các trang sản phẩm công khai, không đăng nhập, không gọi giỏ/checkout. Tối đa 30 trang danh mục và 200 sản phẩm mỗi nguồn, nghỉ ít nhất 1 giây giữa các yêu cầu cùng nguồn. Có thể còn trang chưa duyệt; xem `remaining_listing_pages` và `discovered_products` trong báo cáo. Hai nguồn trang chủ có thể gồm nhiều loại hàng khác nhau; danh mục gán theo nhóm rộng, cần rà lại phân loại trước khi nhập.

Ảnh được lưu dưới dạng URL nguồn và URL ảnh mô tả; chưa tải hàng loạt ảnh về dự án và chưa đưa vào giao diện. Quyền tái sử dụng ảnh/nội dung chưa xác minh. Không đổi thương hiệu nguồn thành sản phẩm do Làng Mộc sản xuất.

Giá là ảnh chụp tại lúc lấy dữ liệu, có thể thay đổi. Giá liên hệ hoặc không đọc được là `null`, không tự tạo giá. Khoảng giá của biến thể được giữ riêng nếu phát hiện. Tồn kho và đánh giá không được tự sinh. Nguồn gốc/làng nghề không suy luận từ danh mục hay địa chỉ cửa hàng. `origin_not_verified` yêu cầu kiểm duyệt thêm.

Maries có mô tả nằm trong ảnh nên có thể không có mô tả chữ. Xem `description_image_urls`. Dữ liệu này là đầu vào chuẩn hóa, chưa phải seed PostgreSQL chạy trực tiếp. Trước khi dùng trong API: map seller/category, xác nhận sản phẩm có giá và ảnh hợp lệ, rà quyền sử dụng, bổ sung dữ liệu demo thiếu một cách minh bạch.

## Tái tạo

Cần Python 3 và beautifulsoup4. Từ gốc repo:

```sh
python3 scripts/crawl_products.py
python3 scripts/recover_tiemgomviet.py
python3 scripts/finalize_catalog.py
```

Hai bước sau chỉ đọc cache local, không gửi yêu cầu mạng. Xem xét thay đổi quy định truy cập trước lần chạy mới. Đọc báo cáo lỗi trước khi dùng dữ liệu.
