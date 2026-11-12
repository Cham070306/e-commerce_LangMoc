# C4 - Checkout, kiểm thử và bàn giao

Chủ phần việc: Sơn. Branch tích hợp: `feature/son-c4-develop`. Kết quả kiểm chứng branch tích hợp ngày 13/11/2026: [báo cáo test và build](../evidence/checkout/integrated-validation-2026-11-13.md). Log dưới đây còn lưu minh chứng lịch sử của branch C4 gốc.

## Phạm vi code

| Module trong backend/src/modules | Đầu ra |
|---|---|
| cart | GET giỏ, PUT số lượng, DELETE món; khóa giỏ theo user |
| orders | Preview, COD, lịch sử/chi tiết, hủy pending, snapshot, khóa tồn, chống request lặp |
| promotions | Thời hạn/lượt dùng/đơn tối thiểu, giảm nguyên VND |
| reviews | Tạo chờ duyệt, mỗi user/sản phẩm một lần; GET chỉ visible |
| contact | Lưu liên hệ, validation, giới hạn 5 tin/phút/IP trong DB |
| admin | Đơn/trạng thái/vận đơn, review, contact, mã giảm |

`backend/src/c4.mjs` ghép route vào app C3. C3 giữ auth, địa chỉ, catalog và admin sản phẩm/danh mục. Migration 006 và API cần người khác review trước merge.

Phương án đã hiện thực được ghi tại [ranh giới module](../decisions/001-c4-module-boundary.md), [checkout](../decisions/002-c4-checkout-integrity.md), [chính sách MVP](../decisions/003-c4-mvp-policies.md); cả ba đang chờ nhóm review.

## Luồng COD

1. C3 xác minh phiên; C4 đọc lại role/is_active từ DB.
2. Preview đọc giỏ/giá/mã, tính phí demo cố định 30.000 VND, trả `checkout_quote` ký HMAC hạn 5 phút.
3. Frontend gửi `address_id,payment_method=cod,promotion_code?,note?,checkout_quote` và `Idempotency-Key`. Giá/tổng/trạng thái thanh toán client gửi không được dùng tính đơn.
4. Một connection trong transaction khóa giỏ bằng advisory lock theo user. Cùng key thì kiểm fingerprint và trả đơn cũ **trước** khi đọc giỏ/báo giá; đổi nội dung với key cũ trả 409.
5. Khóa địa chỉ thuộc user, sản phẩm theo thứ tự UUID, mã giảm. Kiểm tồn/trạng thái/thời hạn, tính lại giá. Quote sai/hết hạn hoặc giá đổi trả 409.
6. Lưu snapshot đơn/items, trừ tồn, tăng lượt mã, dọn giỏ rồi commit. Lỗi bất kỳ rollback toàn bộ.

Khóa hoạt động giữa các connection/process, không phải mutex trong bộ nhớ. Worker dùng cùng secret để kiểm quote. Nếu C3/script khác sửa trực tiếp giỏ đồng thời, phải dùng cùng giao thức khóa `c4-cart:<UUID user>`.

## Quyết định MVP trong nhánh để nhóm review

- Chỉ COD. Guest live, gateway/webhook, lưu điều khoản T4/T5 chưa bật.
- Chỉ hủy pending; khóa order đảm bảo hoàn tồn một lần. Admin có API pending -> cancelled; UI C2 chưa có nút.
- `pending -> confirmed -> packing -> shipping -> delivered`. Cần carrier + tracking trước shipping. Vận đơn dùng **PATCH**, đúng client hiện tại.
- COD delivered vẫn unpaid tới khi có quy trình đối soát; chưa có endpoint đối soát trong v1.
- Hủy không hoàn lượt mã: usage_limit đếm checkout thành công. Đổi chính sách cần đổi test.
- Tài khoản hoạt động được gửi review, không bắt buộc đơn delivered ở MVP, giữ hành vi C2. Review chờ duyệt; JSON văn bản thuần, frontend render text.
- Mã admin chuẩn hóa uppercase; seed C3 cũng cần uppercase. PATCH chỉ thời hạn/is_active/usage_limit, không sửa loại/giá trị giảm.
- Quota contact dùng địa chỉ socket, bỏ qua X-Forwarded-For tự gửi. Sau reverse proxy, C3 cần thiết kế resolver IP tin cậy; hiện khách sau cùng proxy dùng chung quota. Không xuất hash IP qua API.

## Dữ liệu thử cho C2 và R4

`backend/tests/postgres.integration.mjs` tự tạo admin, hai customer, admin vô hiệu hóa, địa chỉ riêng, sản phẩm giá 100.000 VND với tồn 1/2/3/5/10, mã hết hạn/một lượt. UUID và password DB ngẫu nhiên. Đây là fixture kiểm thử, **không phải tài khoản đăng nhập demo**. C3 cần cung cấp seed có password hash thật/catalog để chạy trình duyệt live.

| Ca | Bước/dữ liệu | Mong đợi, kiểm chứng bằng PostgreSQL |
|---|---|---|
| C4-01 | 8 create đồng thời cùng user/key, quantity 2 | Một đơn; tồn 5 -> 3, giỏ rỗng, retry trả đơn cũ |
| C4-02 | Key cũ, note khác | 409, không có đơn mới |
| C4-03 | Hai khách mua món cuối | Một thành công, một 409, tồn 0 |
| C4-04 | Hai khách dùng mã một lượt | Một thành công, used_count 1 |
| C4-05 | Mã hết hạn | 409, tồn giữ nguyên |
| C4-06 | Giá đổi sau preview hoặc bỏ quote | 409, giữ giỏ/tồn |
| C4-07 | Địa chỉ/đơn của người khác | 404 |
| C4-08 | Hủy pending đồng thời | Hoàn tồn một lần |
| C4-09 | Tiêm lỗi DB khi dọn giỏ | Rollback đơn/items/tồn/mã/giỏ; retry sau bỏ lỗi thành công |
| C4-10 | Sửa tên/giá sản phẩm đã mua | Đơn cũ giữ snapshot |
| C4-11 | Nhảy trạng thái, thiếu vận đơn, hủy confirmed | 409; vận đơn quá dài 400 |
| C4-12 | No login, customer vào admin, inactive, spoof header | 401/403, role chỉ từ DB |
| C4-13 | Review trùng/pending/visible/hidden/script | Trùng 409; chỉ visible công khai, nội dung là text JSON |
| C4-14 | Contact email sai, tin thứ 6/phút | 400/429; chỉ admin đọc hộp thư |
| C4-15 | HTTP giỏ -> preview -> COD -> retry -> hủy | Envelope/201/200/204 đúng, không lộ fingerprint |

Cách chạy: [backend README](../../backend/README.md). Kết quả: [minh chứng](../evidence/checkout/README.md).

## Còn phụ thuộc nhóm

1. Khải review migration, cung cấp pool/resolver cookie/seed auth/catalog/addresses. Map frontend `full_name/street_address` sang DB `recipient_name/address_line`.
2. Quân review field checkout_quote đã nối tối thiểu ở types/Checkout. Mock vẫn chạy do field optional. Ưu tiên API.md/client thật khi `c2-status.md` cũ ghi method khác.
3. Chạy major PostgreSQL nhóm chọn, macOS và máy thứ hai; kiểm thử trình duyệt live desktop/mobile, chụp minh chứng thật.
4. Review chéo trước merge. Fixture xác thực trong test không chứng minh đã ghép auth thật.

Tham chiếu: [PostgreSQL locking](https://www.postgresql.org/docs/16/explicit-locking.html), [node-postgres transactions](https://node-postgres.com/features/transactions).
