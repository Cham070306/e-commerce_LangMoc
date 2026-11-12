# 003 - Chính sách giao dịch và tương tác trong bản C4

Ngày: 11/11/2026. Người chuẩn bị: Sơn/C4.

**Trạng thái: hành vi hiện tại của nhánh, chờ nhóm chốt chính sách; chưa phải quyết định kinh doanh cuối cùng.**

## Phương án và lý do

| Nội dung | Hành vi trong nhánh | Lý do và ảnh hưởng |
|---|---|---|
| Thanh toán | Chỉ COD, phí ship demo 30.000 VND | Một quy tắc server để kiểm thử; cần thống nhất với UI/chính sách/báo cáo |
| Trạng thái tiền | Delivered vẫn unpaid | Trạng thái giao hàng tách đối soát; chưa có endpoint xác nhận thu tiền |
| Hủy | Chỉ pending, hoàn tồn một lần | Tránh hủy sau xác nhận và hoàn tồn lặp; admin có API, UI C2 chưa có nút |
| Mã giảm | Hủy không trả lượt mã | usage_limit hiện đếm checkout thành công; nếu đổi phải cập nhật service và test |
| Review | Tài khoản hoạt động gửi một review/sản phẩm, chờ duyệt | Giữ luồng C2; lựa chọn này không yêu cầu đơn delivered, cần nhóm xác nhận |
| Contact | Tối đa 5 tin/phút/IP socket, quota trong DB | Chia sẻ quota giữa worker; sau proxy cần chốt resolver IP tin cậy |
| Guest/gateway/điều khoản | Chưa bật live | Chưa có hợp đồng/schema/quy trình được nhóm xác nhận |

## Điều kiện chấp nhận

Sơn phối hợp Khải/Quân và nhóm báo cáo xác nhận các hàng trên trước khi trình bày là tính năng đã tích hợp. Chưa có bằng chứng trao đổi bên ngoài repo trong phiên này. Mọi điều chỉnh cần cập nhật API, test, tài liệu và nội dung chính sách liên quan. Không dùng kết quả mock làm bằng chứng live.

Nguồn: [API](../API.md), [bàn giao C4](../testing/checkout.md), [điểm chờ C2](../evidence/c2-status.md).
