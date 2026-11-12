# 001 - Ranh giới module C4 và cách ghép backend C3

Ngày: 11/11/2026. Người chuẩn bị: Sơn/C4.

**Trạng thái: đã hiện thực trên nhánh C4, chờ nhóm review; chưa là quyết định được cả nhóm duyệt.**

## Bối cảnh

Backend C3 chưa có auth/catalog/địa chỉ trong checkout hiện tại. Kế hoạch nhóm chốt PostgreSQL và đề xuất TypeScript/Express hoặc NestJS; chưa có code server C3 để ghép. C4 cần triển khai và kiểm thử giao dịch mà vẫn giữ phần sở hữu của Khải.

## Phương án trong nhánh

- C4 cung cấp `createC4Handler` cùng service theo nghiệp vụ. Dùng JavaScript ESM `.mjs`, Node 22.18+, không tự chọn framework cho server C3. Đây là khác biệt với đề xuất TypeScript xuyên suốt, cần Khải review trước khi ghép; có thể chuyển ngôn ngữ khi nhóm chốt stack mà giữ hợp đồng HTTP.
- C3 cung cấp pool PostgreSQL và resolver phiên cookie. C4 chỉ nhận ID đã xác minh, đọc lại role/is_active từ DB; không nhận danh tính từ header client.
- C3 tiếp tục sở hữu auth, catalog, địa chỉ, admin danh mục/sản phẩm. C4 chỉ sửa tối thiểu hai file C2 để chuyển báo giá, cần Quân review.
- Route điều phối ở `backend/src/c4.mjs`; nghiệp vụ ở `backend/src/modules/*/service.mjs`, helper ở `backend/src/common/c4.mjs`.

## Lý do

Cho phép kiểm thử PostgreSQL thật và bàn giao module rõ ràng khi auth/catalog chưa sẵn. Tránh tạo frontend/server xác thực thứ hai hoặc thêm cách đăng nhập giả vào code triển khai.

## Ảnh hưởng và điều kiện chấp nhận

- C4 chưa chạy độc lập thành sản phẩm có login. Resolver fixture trong test không thay thế auth thật.
- Khải cần review lựa chọn module/ngôn ngữ, cách mount, pool và cookie/Origin trước merge.
- PostgreSQL kiểm thử hiện là 18.6, Windows x64. Chưa xác nhận cùng major với nhóm hoặc chạy macOS/máy thứ hai.

Nguồn: [kế hoạch nhóm](../TEAM_PLAN.md), [cấu trúc code](../PROJECT_STRUCTURE.md), [hướng dẫn ghép](../../backend/README.md).
