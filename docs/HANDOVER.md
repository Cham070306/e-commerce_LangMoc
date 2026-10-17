# Bàn giao Làng Mộc cho người tiếp theo

Cập nhật ngày 17/10/2026. Nhánh bàn giao: `develop`, kho `Cham070306/e-commerce_vietcraft`. Commit chức năng nền: `8e0f88f` (storefront, dữ liệu catalog, hình ảnh và tài liệu).

## Khởi động trên máy mới

```sh
git clone --branch develop https://github.com/Cham070306/e-commerce_vietcraft.git
cd e-commerce_vietcraft/frontend
npm ci
npm run dev
```

Mở địa chỉ Vite in trong terminal; mặc định `http://127.0.0.1:5173/`. Dùng Node 22.18+ hoặc 24+ để chạy bài kiểm thử TypeScript.

```sh
npm run build
npm test
npm run preview
```

Lần kiểm tra trước bàn giao: build production thành công, 6/6 test catalog đạt. Đây là kiểm tra frontend và dữ liệu; chưa nghiệm thu backend, checkout hoặc tích hợp end-to-end. Không có lần kiểm tra trình duyệt mới trong phiên bàn giao này.

## Những gì đã có

- React + Vite + TypeScript; giao diện xanh lam đậm, kem và nâu đồng, có bố cục responsive.
- Trang chủ `/#/`, danh mục `/#/catalog`, chi tiết `/#/product/<slug>`; điều hướng hash nằm trong `frontend/src/App.tsx`.
- Tìm kiếm có/không dấu, lọc danh mục/khoảng giá, sắp xếp, phân trang; trạng thái tải, rỗng, lỗi và thử lại.
- GET API mock qua HTTP cho categories, products, detail và reviews; fixture 449 sản phẩm, ảnh đại diện lưu local. Đánh giá mock và giá demo có nhãn minh họa.
- Schema PostgreSQL và hợp đồng API đã có; `backend/` hiện là khung, chưa có backend chạy được.

## File cần đọc trước khi sửa

| Nội dung | Đường dẫn trong repo |
|---|---|
| Phạm vi storefront, route, giới hạn, nối API | [ui-inventory.md](design/ui-inventory.md) |
| Hợp đồng dữ liệu/API | [API.md](API.md), [DATA_MODEL.md](DATA_MODEL.md) |
| Phân công và các mốc nhóm | [TEAM_PLAN.md](TEAM_PLAN.md) |
| SQL khởi tạo | [001_initial.sql](../database/001_initial.sql) |
| API client và kiểu dữ liệu | `frontend/src/lib/api.ts`, `types.ts` |
| Logic query và test | `frontend/src/features/catalog/query.ts`, `frontend/tests/catalog.test.ts` |
| Mock và cấu hình proxy | `frontend/mock/server.ts`, `frontend/vite.config.ts` |
| Dữ liệu và nguồn ảnh | `data/catalog/`, `frontend/mock/catalog.json`, `frontend/public/images/` |
| Minh chứng đã lưu | [storefront/README.md](evidence/storefront/README.md) |

## Việc tiếp theo

1. Người phụ trách backend triển khai auth/catalog và migration/seed theo hợp đồng; người giao dịch triển khai giỏ, tính tổng, tồn kho và đặt COD.
2. Người phụ trách UI bổ sung Auth/Cart/Checkout/Orders rồi admin, contact và chính sách. Nút mua hiện dẫn tới nguồn sản phẩm; chưa có giỏ/checkout hoạt động.
3. Nối API thật: copy `frontend/.env.example` sang `frontend/.env.local`, đặt `VITE_API_MODE=live`, chỉnh `API_PROXY_TARGET` theo cổng backend rồi khởi động lại Vite. Mẫu frontend đang dùng cổng 3000 trong khi mẫu gốc ghi `API_PORT=4000`; cần đặt đồng nhất với backend thực tế.
4. Kiểm tra GET và response envelope `{data}` / `{data,meta}`, lỗi `{error:{code,message}}`. Live mode không tự chuyển về mock khi API lỗi.
5. Nghiệm thu desktop/mobile và luồng mua hàng khi backend sẵn sàng; cập nhật README, minh chứng và tài liệu theo kết quả thực.

## Lưu ý dữ liệu và triển khai

- Mock được phục vụ bằng middleware Vite dev/preview; chỉ đưa thư mục `dist/` lên static hosting sẽ không có mock API. Cần backend thật hoặc máy chủ phục vụ middleware tương ứng.
- Giá demo được tạo ở `scripts/prepare_frontend_catalog.py`, đánh dấu `price_is_demo=true`; không dùng làm giá giao dịch thật. Review mock cũng không phải đánh giá khách hàng thật.
- Dữ liệu crawl là snapshot; còn thông tin giá/mô tả/nguồn gốc cần xác minh. Ảnh đại diện có bản local, một số ảnh phụ vẫn dùng URL nguồn. Xem ghi chú cập nhật cuối trong UI inventory để hiểu các thay đổi so với số liệu cũ.
- Tạo lại fixture từ gốc repo bằng `python3 scripts/prepare_frontend_catalog.py`, sau đó chạy lại build và test, kiểm tra diff trước khi commit.
- `.env`, `node_modules`, `dist`, raw crawl và log thuộc `.gitignore`; không nằm trong lần bàn giao. Chỉ file cấu hình mẫu được commit. Tạo cấu hình cá nhân tại máy mới.
- Trước khi công bố website, nhóm cần xác minh quyền sử dụng nội dung/ảnh bên ngoài và thông tin liên hệ, chính sách.

## Tiếp tục làm việc

Lấy bản mới nhất của `develop`, tạo nhánh chức năng từ đó rồi gửi PR về `develop` theo quy trình nhóm. Tránh ghi đè thay đổi của người khác; không sửa SQL khởi tạo đã được mọi người chạy mà không thống nhất, ưu tiên migration mới.
