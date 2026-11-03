# Đánh giá main Làng Mộc — 02/11/2026

Repo: https://github.com/Cham070306/e-commerce_LangMoc/tree/main
Commit kiểm tra: 4723d9deb55086b5aa5ead5849227bdfc5b7d8cc.
Căn cứ: docs/TEAM_PLAN.md, docs/API.md, docs/evidence/c2-status.md, docs/evidence/c2-checklist-results.md và code thực tế. Không có rubric chấm điểm riêng của giảng viên ngoài ma trận nhóm ghi trong repo.

## Kết luận
Frontend đủ để demo nhiều luồng chính ở chế độ mock. Chưa đủ nghiệm thu website thương mại điện tử có backend và dữ liệu thật. Không dùng số test đạt để suy ra phần trăm hoàn thiện toàn dự án.

## Kiểm tra thực hiện độc lập
- npm ci thành công; npm run build thành công.
- npm test: 60/60 đạt.
- node --experimental-strip-types --test tests/*.test.ts: 66/66 đạt. Script npm test đang bỏ sót 2 file dot_b_mock_sync.test.ts và f01_f07.test.ts.
- Vite dev chạy tại http://127.0.0.1:5173/.
- Trình duyệt: trang chủ, danh mục 449 sản phẩm; tìm từ zzzzkhongco hiện trạng thái không có kết quả, có đường quay về danh mục.
- Đăng nhập tài khoản demo Linh, thêm Tô Lượn vào giỏ, checkout COD: giá hàng 313.200 + phí ship 30.000 = 343.200 đồng.
- Nút đặt hàng bị khóa khi chưa đồng ý chính sách; sau khi đồng ý tạo được đơn mô phỏng LM-20261102-0003, giỏ về 0, đơn xuất hiện ở lịch sử với trạng thái Chờ xác nhận.
- Chưa kiểm thử trên điện thoại vật lý, chưa chạy giao dịch live, chưa thực hiện toàn bộ thao tác admin trên trình duyệt. Test admin hiện xác minh logic mock.

## Đối chiếu yêu cầu
| Nhóm chức năng | Hiện trạng | Đánh giá |
|---|---|---|
| Trang chủ, danh mục, chi tiết, ảnh | Có giao diện và dữ liệu mẫu, tìm/lọc/sắp xếp/phân trang có test | Khá đầy đủ cho demo frontend |
| Tài khoản | Đăng nhập demo hoạt động; có màn hình đăng ký/tài khoản | Chưa có xác thực backend trên main |
| Giỏ, COD, lịch sử đơn | Luồng trình duyệt hoàn tất được trên mock | Chưa có transaction/DB thật |
| Admin | Có UI và mock danh mục/sản phẩm/đơn/review/contact; test logic đạt | Chưa nghiệm thu live |
| Liên hệ, feedback | Có trang/form và mock | Chưa lưu DB thật; thông tin đơn vị còn trống |
| Khuyến mại, giá mới/cũ | Có logic minh họa và test mock | Chưa kiểm tra giá/tồn/mã giảm ở backend |
| Chính sách | Có nội dung và liên kết trong checkout/footer | Cần nhóm xác nhận nội dung cuối |
| Google Maps | siteMaps.status=CHƯA_CHỐT, query=null | Chưa hoàn thành |
| Đánh giá/bình luận | Chi tiết hiển thị review mẫu, admin có duyệt | Chưa có luồng khách gửi review trên trang chi tiết đã kiểm tra |
| Địa chỉ chuẩn tỉnh–xã | Account/Checkout còn nhập văn bản và kiểm tra rỗng | Chưa đáp ứng T2 chọn tỉnh–xã theo dữ liệu chuẩn |
| Backend/DB | backend chỉ có khung, database chỉ có 001_initial.sql, không có backend/package.json | Chưa có backend chạy được trong main này |
| Bàn giao/triển khai | Có hướng dẫn frontend; chứng cứ mobile/live chưa hoàn tất | Chưa đạt M4 của kế hoạch |

## Nhận xét theo phạm vi phân công
- C1 (giao diện mua sắm): có nền tảng tốt, catalog hoạt động. Cần nối API, bổ sung dữ liệu mây tre đan (đang 0 sản phẩm), hoàn thiện thông số/nguồn gốc và chữ hiển thị.
- C2 (tài khoản/mua hàng/admin UI): luồng COD mock chạy được xuyên suốt. Còn T2 địa chỉ chuẩn, Maps, thông tin liên hệ và kiểm thử tích hợp thật. Không quy trách nhiệm phần backend chưa có cho người làm UI.
- C3 (auth/catalog/database): chưa hiện diện ở main đang đánh giá. Code Khai đã merge local vào develop của thư mục e-commerce_vietcraft trước đó là phạm vi khác, không được tính là đã tích hợp vào repo/main này.
- C4 (giao dịch/admin API): main chưa có backend giỏ/checkout/đơn/review/contact để nghiệm thu. Mock thể hiện hợp đồng mong đợi, chưa chứng minh API thật đã làm.
- Đây là đánh giá sản phẩm đang tích hợp; không kết luận cá nhân chưa viết code ở nhánh khác.

## Các việc ưu tiên
1. Gộp backend C3 vào đúng repo tích hợp; thiết lập PostgreSQL, migration/seed, xác minh auth/catalog live.
2. Hoàn tất C4: giỏ, preview, COD trong transaction, idempotency, tồn kho, đơn và admin, review/contact.
3. Nối frontend live và chạy E2E khách đặt đơn → admin xử lý → khách xem trạng thái, kiểm tra request lặp, hết hàng, quyền truy cập và dữ liệu còn sau restart.
4. Hoàn thành tỉnh–xã chuẩn, Maps/thông tin liên hệ, khách gửi đánh giá, đồng bộ thông báo trên UI.
5. Chạy mobile thật, bổ sung minh chứng T1–T5/Q-T22/Q-T23 và cập nhật README. Chưa cần gateway thanh toán vì kế hoạch chấp nhận COD.

## Vấn đề trải nghiệm và giới hạn kỹ thuật
- Chi tiết sản phẩm vẫn ghi “Chưa mở bán” trong khi nút mua hoạt động; drawer giỏ ghi chờ backend dù checkout mock đã có. Cần thống nhất thông điệp demo.
- Dữ liệu catalog chưa cân bằng: gốm 221, thổ cẩm 221, nón 7, mây tre 0; một số giá là demo và mô tả/thông số chưa đầy đủ.
- Mock dùng dữ liệu trong bộ nhớ server và cookie chứa ID demo; không được coi là xác thực production hay lưu trữ bền vững.
- Vite config cung cấp mock ở dev/preview; chỉ deploy dist lên static host sẽ không có các API mock đó.
- 66 bài test hiện có chủ yếu kiểm tra hàm/logic và handler mock, không thay thế kiểm thử tích hợp PostgreSQL, an toàn session hoặc trình duyệt đa thiết bị.
