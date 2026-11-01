# Đối chiếu phạm vi giao diện mua sắm — 15/10/2026

| Yêu cầu | Hiện trạng | Minh chứng / giới hạn |
|---|---|---|
| Home, Catalog, Product | Đã có | frontend/src/pages; điều hướng hash |
| Responsive | Đã có CSS desktop/mobile | Có ảnh kiểm tra bản trước; chưa kiểm tra trực quan bản cuối do browser tool bị chặn |
| Tìm kiếm, danh mục, khoảng giá, sắp xếp, phân trang | Đã có | GET mock, URL filters; 6 test hiện có PASS. Thanh giá chung hai đầu kéo |
| Ảnh sản phẩm | Đã có | 449 ảnh đại diện local được test tồn tại; ảnh phụ vẫn có nguồn remote và fallback |
| Giá cũ/mới, khuyến mãi | Đã có | Chỉ giảm giá khi nguồn có; giá thiếu gán demo theo yêu cầu, có price_is_demo và nhãn |
| Đánh giá hiển thị | Đã có | GET reviews, sao, phân trang, loading/empty/error; nhận xét fixture gắn nhãn demo |
| GET categories/products/reviews | Đạt với mock HTTP | api.ts dùng fetch; .env.example hỗ trợ live và proxy; chưa nghiệm thu backend thật |
| Ảnh và giá nhất quán | Dữ liệu dùng chung | ProductCard/Price/ProductImage tái sử dụng; cần kiểm tra UI bản cuối để chốt |
| Component bàn giao | Đã có phần lớn | Header, Footer, ProductCard, Reviews, States; bộ lọc còn nằm trong Catalog.tsx, nên tách nếu C2 cần dùng riêng |

Build và sáu test hiện có đạt sau lần sửa này. Test hiện có kiểm tra dữ liệu/query/ảnh; không phải test tương tác giỏ hàng. Không tuyên bố nghiệm thu hoàn tất khi chưa kiểm tra UI bản cuối và live backend.

## Hai nút mua hàng bổ sung theo yêu cầu

ProductPurchase thay nút mở trang nguồn. Thêm vào giỏ lưu localStorage key langmoc.cart.v1, cộng số lượng khi thêm trùng; có xem/xóa giỏ và thông báo lỗi lưu. Mua ngay mở dialog xem trước một sản phẩm, không ghi nhận thanh toán hay tạo đơn. Nút tiếp tục khám phá đóng dialog. Đây là tương tác frontend để bàn giao C2; chưa nối API cart/order/payment. Không cần nhập dữ liệu cá nhân.
