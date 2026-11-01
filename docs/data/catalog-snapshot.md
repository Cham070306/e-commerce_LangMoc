# Kết quả thu thập sản phẩm Làng Mộc

Ngày thu thập: 14/10/2026 (giờ Việt Nam).

| Nguồn | Sản phẩm | Có giá | Có URL ảnh |
|---|---:|---:|---:|
| Gốm sứ Yên Lam | 196 | 165 | 196 |
| Tiệm Gốm Việt | 25 | 25 | 25 |
| Maries | 7 | 7 | 7 |
| Craft Link | 16 | 16 | 16 |
| Khăn Minh Phong | 5 | 1 | 5 |
| Balo Thổ Cẩm | 200 | 200 | 200 |

Tổng: **449 sản phẩm**, 414 có giá, 449 có URL ảnh, 401 có mô tả chữ.

## Phạm vi và giới hạn

- Đây là snapshot có giới hạn, không phải bản sao toàn bộ sáu website.
- Yên Lam: đã duyệt 30 trang danh mục, lấy 196 sản phẩm; còn 6 đường dẫn danh mục trong hàng đợi. Hai liên kết danh mục cũ trả 404, được ghi trong báo cáo nguồn.
- Balo Thổ Cẩm: phát hiện 214 đường dẫn sản phẩm, lấy 200 theo giới hạn đợt đầu; còn các trang danh mục chưa duyệt.
- Bốn nguồn còn lại đã đi hết các liên kết phân trang tìm thấy trong phạm vi URL được chỉ định. Không bảo đảm website không còn sản phẩm ngoài danh mục đó.
- 35 sản phẩm chưa có giá công bố/đọc được; để null, không tự tạo giá. 48 sản phẩm thiếu mô tả chữ.
- Không tự sinh stock, khuyến mại, đánh giá hoặc xác nhận làng nghề. Các sản phẩm cần rà nguồn gốc có cờ origin_not_verified.
- Ảnh giữ URL nguồn; chưa tải hàng loạt và quyền tái sử dụng chưa xác minh.
- Chưa tích hợp bộ dữ liệu vào UI hay chạy seed lên PostgreSQL.

## File

- `data/catalog/products.json`: dữ liệu tổng hợp, 449 dòng trong data.
- `data/catalog/products.csv`: bảng UTF-8 BOM mở được bằng Excel.
- `data/catalog/quality-report.json`: kiểm tra chất lượng.
- `data/catalog/<source>.json`: báo cáo và dữ liệu từng nguồn.
- `data/catalog/README.md`: hướng dẫn chạy lại và cách dùng.

## Kiểm tra đã thực hiện

- ID nguồn duy nhất; tên không rỗng; URL nguồn HTTPS.
- Giá là số nguyên VND dương hoặc null; đối chiếu chọn mẫu với HTML nguồn.
- Tách giá bán hiện tại khỏi giá gạch ngang và phần trăm khuyến mại.
- Không có giá vượt ngưỡng 100 triệu VND trong bộ dữ liệu hiện tại.
