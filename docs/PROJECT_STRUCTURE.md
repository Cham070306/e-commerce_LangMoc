# Cây thư mục Việt Craft

Cây dưới đây đã được tạo trong repo. File `.gitkeep` giữ thư mục trống hiển thị trên GitHub; xóa file đó khi thư mục có code. Chưa chốt framework frontend/backend vì giao diện responsive hiện có chưa nằm trong repo.

```text
e-commerce_langmoc/
├── frontend/                    # người 1 và 2; nhập giao diện responsive hiện có
│   ├── public/                  # ảnh/logo/file tĩnh công khai
│   └── src/
│       ├── assets/              # asset được import vào mã nguồn
│       ├── components/
│       │   ├── layout/          # header, footer, menu
│       │   ├── catalog/         # thẻ sản phẩm, bộ lọc, giá
│       │   └── forms/           # input, thông báo lỗi, nút dùng chung
│       ├── pages/               # Home, Catalog, Product, Cart, Checkout, Auth, Admin...
│       ├── features/
│       │   ├── auth/
│       │   ├── catalog/
│       │   ├── cart/
│       │   ├── checkout/
│       │   └── reviews/
│       ├── lib/                 # API client, định dạng tiền/ngày, tiện ích chung
│       └── styles/              # CSS, token giao diện nếu framework cần
├── backend/                     # người 3 và 4
│   ├── src/
│   │   ├── config/             # đọc và kiểm tra biến môi trường
│   │   ├── db/                 # kết nối PostgreSQL, transaction
│   │   ├── middleware/         # xác thực, phân quyền, validation, lỗi
│   │   ├── common/             # kiểu dữ liệu, helper dùng chung
│   │   └── modules/
│   │       ├── auth/           # người 3
│   │       ├── catalog/        # người 3; category/product/admin catalog
│   │       ├── cart/           # người 4
│   │       ├── orders/         # người 4; checkout, orders, shipment
│   │       ├── promotions/     # người 4
│   │       ├── reviews/        # người 4
│   │       ├── contact/        # người 4
│   │       └── admin/          # người 3/4; route chung, dashboard khi có
│   └── tests/                  # test API và luồng mua hàng
├── database/
│   ├── 001_initial.sql         # schema PostgreSQL hiện có
│   └── seeds/                  # dữ liệu demo, do người 3 làm
├── docs/
│   ├── API.md                  # hợp đồng API
│   ├── DATA_MODEL.md           # ERD và quy tắc dữ liệu
│   ├── TEAM_PLAN.md            # phần việc 4 người, mốc và nghiệm thu
│   ├── PROJECT_STRUCTURE.md
│   └── decisions/              # ghi quyết định thay đổi kiến trúc
├── .env.example                # tên biến môi trường, không có secret thật
├── .gitignore
└── README.md
```

## Cách đặt code

- Trang đầy đủ ở `frontend/src/pages/`. Thành phần dùng lại ở `components/`; logic và trạng thái riêng của từng nghiệp vụ ở `features/`. Không nhân bản hàm gọi API trong mỗi trang: đặt API client tại `frontend/src/lib/`.
- Mỗi module backend nên chứa route/controller, xử lý nghiệp vụ/service, truy vấn/repository và validation/DTO theo framework mà nhóm chốt. Quy tắc nghiệp vụ đặt trong service, không viết tất cả trong route.
- Người 3 giữ `database/001_initial.sql` cho bản khởi tạo. Sau khi mọi người đã chạy bản này, mọi thay đổi schema phải thêm file migration đánh số tiếp theo; không sửa lịch sử migration đang dùng.
- `backend/tests/` chứa kiểm thử API, nhất là quyền, giá, tồn kho và tạo đơn lặp. Frontend thêm test theo framework thực tế sau khi nhập giao diện.
- `docs/decisions/` ghi một file ngắn mỗi khi nhóm đổi stack, cách xác thực, thanh toán hay thiết kế nhiều nhà bán; gồm quyết định, lý do và ảnh hưởng.

## Khi đưa giao diện hiện có vào

Người phụ trách giao diện kiểm tra framework và tên thư mục của code cũ trước. Nếu là React/Vite, có thể đưa `package.json`, `index.html`, `src/` vào `frontend/` rồi ghép dần với cây trên. Nếu là Next.js hoặc HTML/CSS/JS thuần, giữ cấu trúc cần thiết để dự án đang có vẫn chạy, sau đó cập nhật sơ đồ này cho đúng. Tránh tạo hai ứng dụng frontend hoặc di chuyển hàng loạt asset cùng lúc với việc sửa tính năng.
