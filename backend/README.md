# C4 - API giao dịch của Sơn

C4 bổ sung handler Express và service PostgreSQL cho giỏ hàng có đăng nhập, checkout COD, khuyến mại, đơn hàng, review, contact và admin. Trong branch này handler đã được mount vào app C3 và dùng session cookie hiện có. Không nhận user/role từ header trong code triển khai.

## Cài và kiểm thử

Yêu cầu Node 22.18+, PostgreSQL 16+ cho môi trường nhóm. Backend dùng npm và `package-lock.json` theo cấu hình develop.

```sh
cd backend
npm ci
npm test
```

Trước khi chạy app local, copy `../.env.example` thành `backend/.env`; đặt `DATABASE_URL` local và thay `C4_QUOTE_SECRET` bằng secret ngẫu nhiên từ 32 ký tự trở lên. Không dùng secret mẫu trên môi trường dùng chung.

Test tạo PostgreSQL thật riêng trong thư mục tạm, cổng loopback ngẫu nhiên, mật khẩu ngẫu nhiên, tự dừng và dọn sau khi chạy. Không đọc `DATABASE_URL` và không chạm database cá nhân. Gói thử nghiệm dùng PostgreSQL 18.6; vẫn cần nghiệm thu trên major version nhóm chọn và macOS. Trên Linux, chạy dưới tài khoản thường; test không tự tạo tài khoản hệ điều hành.

Nếu Windows báo thiếu DLL, bảo đảm Visual C++ runtime x64 có sẵn trong PATH. Môi trường Codex hiện dùng thư mục DLL đi kèm Node. Test có junction tạm tránh lỗi initdb khi repo có đường dẫn tiếng Việt.

## Ghép với Khải (C3)

1. Dùng pool `pg` chung do C3 tạo. Mọi transaction C4 lấy/trả cùng một client.
2. App hợp nhất giữ nguyên migrations `001`–`005` của develop; C4 bổ sung `006_c4_transactions.sql`. Chạy `npm run migrate` từ `backend/`. Migration 006 có `IF NOT EXISTS` để tương thích schema guest checkout đã có. Không chạy SQL migration thủ công trên database nhóm.
3. C3 cung cấp `authenticate(req)` xác minh cookie/session, trả `{id}` hoặc `null`. C4 tự lấy role và is_active từ users. C3 sở hữu đăng nhập/đăng xuất, cookie HttpOnly/SameSite/Secure, chống thử mật khẩu và địa chỉ.
4. Chọn secret ngẫu nhiên >=32 ký tự giống nhau giữa các worker, lưu `C4_QUOTE_SECRET` ở `.env` cá nhân. Không dùng giá trị mẫu hoặc commit secret.
5. C4 đã mount ở gốc trước các router/fallback 404 trong `src/app.ts`; handler gọi `next()` cho route C3 và tự nhận prefix `/api/v1`.

```js
import {createC4Handler} from './src/c4.mjs';

// pool và resolveCookieSession do C3 cung cấp.
app.use(createC4Handler({
  pool,
  authenticate: resolveCookieSession,
  quoteSecret: process.env.C4_QUOTE_SECRET,
  allowedOrigins: [process.env.FRONTEND_ORIGIN],
  onError: error => logger.error({code:error.code}, 'C4 request failed')
}));
```

Đây là ví dụ ranh giới module. Không thay resolver thật bằng user cố định của bộ test. JSON middleware trước C4 giới hạn body 64 KiB. Dùng Vite proxy/cùng origin; CORS khác origin thuộc server C3. C4 từ chối Origin ngoài allowlist cho request ghi.

Để chạy app hợp nhất sau khi cấu hình `.env`: `npm run migrate`, `npm run seed`, `npm run dev`. `npm test` chạy test C3 và test C4. Riêng PostgreSQL integration C4 tạo cluster tạm; test API C3 dùng `DATABASE_URL` và dọn dữ liệu giả lập, vì vậy chỉ chạy toàn bộ suite trên database test riêng đã migrate/seed.

Frontend: tạo `frontend/.env.local` với `VITE_API_MODE=live` và `API_PROXY_TARGET=http://127.0.0.1:4000`. Chỉ bật live sau khi C3 có auth/catalog/addresses.

Xem [quy trình và dữ liệu thử](../docs/testing/checkout.md), [minh chứng](../docs/evidence/checkout/README.md), [mô tả PR](../docs/proposals/c4-pr.md).
