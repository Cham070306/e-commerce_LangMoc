// Mock tầng mạng cho phần C2 (tuân thủ 100% docs/API.md)
// Chỉ hoạt động khi VITE_API_MODE !== 'live' trong môi trường Vite dev/preview.
import catalog from './catalog.json' with { type: 'json' };
import { isOrderStatus, isValidTransition } from '../src/lib/orderStatus.ts';

interface DemoUser {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  phone?: string | null;
}

interface DemoAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street_address: string;
  is_default: boolean;
  created_at: string;
}

interface DemoCartItem {
  user_id: string;
  product_id: string;
  quantity: number;
}

// Dữ liệu tồn kho giả lập (chỉ nằm trong mock, KHÔNG sửa catalog.json)
export const demoStockMap: Record<string, number> = {
  // Sản phẩm cụ thể có tồn kho giới hạn để test:
  'balo-phoi-vai-theu-tay-h-mong-d51e21fd': 3,
  'khan-quang-co-to-tam-in-hoa-sen-28ec9761': 2,
  'dia-gom-men-ran-hoa-tiet-hoa-cuc-c032f22b': 0 // Giả lập hết hàng
};

export function getStockForProduct(productId: string): number {
  if (demoStockMap[productId] !== undefined) {
    return demoStockMap[productId];
  }
  return 8; // Mặc định 8 sản phẩm cho các món khác
}

// Lưu trữ in-memory trong phiên chạy server
const demoUsers: DemoUser[] = [
  {
    id: 'user-customer-linh',
    full_name: 'Linh Nguyễn',
    email: 'linh@example.com',
    password: 'MatKhau123@',
    role: 'customer',
    phone: '0901234567'
  },
  {
    id: 'user-admin-langmoc',
    full_name: 'Quản trị viên Làng Mộc',
    email: 'admin@langmoc.example',
    password: 'AdminSecret123@',
    role: 'admin',
    phone: '0909999888'
  },
  {
    id: 'user-customer-minh',
    full_name: 'Minh Trần',
    email: 'minh@example.com',
    password: 'MatKhau123@',
    role: 'customer',
    phone: '0902222333'
  }
];

const demoAddresses: DemoAddress[] = [
  {
    id: 'addr-demo-01',
    user_id: 'user-customer-linh',
    full_name: 'Linh Nguyễn',
    phone: '0901234567',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street_address: '123 Đồng Khởi',
    is_default: true,
    created_at: '2026-10-18T10:00:00Z'
  },
  {
    id: 'addr-demo-02',
    user_id: 'user-customer-minh',
    full_name: 'Minh Trần',
    phone: '0902222333',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street_address: '45 Nguyễn Huệ',
    is_default: true,
    created_at: '2026-10-18T10:00:00Z'
  }
];

export const demoCartItems: DemoCartItem[] = [];

export interface DemoOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
}

export interface DemoOrder {
  id: string;
  order_number: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  shipping_address: string;
  note: string | null;
  status: 'pending' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
  payment_method: 'cod';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal_vnd: number;
  discount_vnd: number;
  shipping_fee_vnd: number;
  total_vnd: number;
  promotion_code?: string | null;
  idempotency_key: string;
  items: DemoOrderItem[];
  shipment?: {
    carrier: string | null;
    tracking_number: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export const demoOrders: DemoOrder[] = [
  {
    id: 'ord-seed-01',
    order_number: 'LM-20261020-0001',
    user_id: 'user-customer-linh',
    recipient_name: 'Linh Nguyễn',
    phone: '0901234567',
    shipping_address: '123 Đồng Khởi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
    note: 'Giao giờ hành chính',
    status: 'delivered',
    payment_method: 'cod',
    payment_status: 'paid',
    subtotal_vnd: 380000,
    discount_vnd: 0,
    shipping_fee_vnd: 30000,
    total_vnd: 410000,
    promotion_code: null,
    idempotency_key: 'seed-key-01',
    items: [
      {
        id: 'item-seed-01',
        order_id: 'ord-seed-01',
        product_id: 'khan-quang-co-to-tam-in-hoa-sen-28ec9761',
        product_name: 'Khăn quàng cổ tơ tằm in hoa sen thủ công',
        product_image_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800',
        unit_price_vnd: 380000,
        quantity: 1,
        line_total_vnd: 380000
      }
    ],
    created_at: '2026-10-20T08:30:00.000Z',
    updated_at: '2026-10-22T14:15:00.000Z',
    shipment: {
      carrier: 'Giao hàng demo',
      tracking_number: 'LM-DEMO-DELIVERED',
      shipped_at: '2026-10-21T08:00:00.000Z',
      delivered_at: '2026-10-22T14:15:00.000Z'
    }
  },
  {
    id: 'ord-seed-02',
    order_number: 'LM-20261023-0002',
    user_id: 'user-customer-linh',
    recipient_name: 'Linh Nguyễn',
    phone: '0901234567',
    shipping_address: '123 Đồng Khởi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
    note: 'Đóng gói cẩn thận giúp mình',
    status: 'pending',
    payment_method: 'cod',
    payment_status: 'unpaid',
    subtotal_vnd: 650000,
    discount_vnd: 50000,
    shipping_fee_vnd: 30000,
    total_vnd: 630000,
    promotion_code: 'LANGMOC10',
    idempotency_key: 'seed-key-02',
    items: [
      {
        id: 'item-seed-02',
        order_id: 'ord-seed-02',
        product_id: 'balo-phoi-vai-theu-tay-h-mong-d51e21fd',
        product_name: 'Balo thổ cẩm phối vải thêu tay H’Mông',
        product_image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
        unit_price_vnd: 650000,
        quantity: 1,
        line_total_vnd: 650000
      }
    ],
    created_at: '2026-10-23T02:00:00.000Z',
    updated_at: '2026-10-23T02:00:00.000Z'
  }
];

function seedAdminOrder(
  id: string,
  orderNumber: string,
  userId: string,
  recipientName: string,
  phone: string,
  status: DemoOrder['status'],
  createdAt: string,
  shipment: DemoOrder['shipment'] = null
): DemoOrder {
  const productId = 'balo-phoi-vai-theu-tay-h-mong-d51e21fd';
  const price = 650000;
  const itemId = `${id}-item-01`;
  return {
    id,
    order_number: orderNumber,
    user_id: userId,
    recipient_name: recipientName,
    phone,
    shipping_address: '45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh',
    note: null,
    status,
    payment_method: 'cod',
    payment_status: 'unpaid',
    subtotal_vnd: price,
    discount_vnd: 0,
    shipping_fee_vnd: 30000,
    total_vnd: price + 30000,
    idempotency_key: `${id}-key`,
    items: [{
      id: itemId,
      order_id: id,
      product_id: productId,
      product_name: 'Balo thổ cẩm phối vải thêu tay H’Mông',
      product_image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800',
      unit_price_vnd: price,
      quantity: 1,
      line_total_vnd: price
    }],
    shipment,
    created_at: createdAt,
    updated_at: createdAt
  };
}

demoOrders.push(
  seedAdminOrder('ord-admin-flow', 'LM-20261024-0010', 'user-customer-minh', 'Minh Trần', '0902222333', 'pending', '2026-10-24T08:00:00.000Z'),
  seedAdminOrder('ord-seed-confirmed', 'LM-20261023-0003', 'user-customer-minh', 'Minh Trần', '0902222333', 'confirmed', '2026-10-23T08:00:00.000Z'),
  seedAdminOrder('ord-seed-packing', 'LM-20261022-0004', 'user-customer-linh', 'Linh Nguyễn', '0901234567', 'packing', '2026-10-22T08:00:00.000Z'),
  seedAdminOrder('ord-seed-shipping', 'LM-20261021-0005', 'user-customer-minh', 'Minh Trần', '0902222333', 'shipping', '2026-10-21T08:00:00.000Z', {
    carrier: 'Đơn vị giao demo',
    tracking_number: 'LM-DEMO-SHIPPING',
    shipped_at: '2026-10-21T09:00:00.000Z',
    delivered_at: null
  }),
  seedAdminOrder('ord-seed-cancelled', 'LM-20261020-0006', 'user-customer-linh', 'Linh Nguyễn', '0901234567', 'cancelled', '2026-10-20T08:00:00.000Z')
);

export const mockIdempotencyMap: Record<string, Record<string, { fingerprint: string; address_id?: string; order: DemoOrder }>> = {};

let orderCounter = 3;
export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const num = String(orderCounter++).padStart(4, '0');
  return `LM-${y}${m}${d}-${num}`;
}

export interface CancelOrderResult {
  statusCode: number;
  data?: { data: DemoOrder };
  error?: { error: { code: string; message: string } };
}

export function cancelOrder(userId: string, orderId: string, reason?: string): CancelOrderResult {
  const order = demoOrders.find(o => (o.id === orderId || o.order_number === orderId) && o.user_id === userId);

  if (!order) {
    return {
      statusCode: 404,
      error: { error: { code: 'NOT_FOUND', message: 'Không tìm thấy thông tin đơn hàng yêu cầu.' } }
    };
  }

  // docs/API.md dòng 54: "Hủy khi đơn còn pending; hoàn tồn trong một transaction"
  if (order.status !== 'pending') {
    return {
      statusCode: 409,
      error: {
        error: {
          code: 'CONFLICT',
          message: `Không thể hủy đơn hàng vì đơn đã ở trạng thái '${order.status}'. Chỉ có thể hủy khi đơn đang ở trạng thái Chờ xác nhận (pending).`
        }
      }
    };
  }

  // Cập nhật trạng thái hủy
  order.status = 'cancelled';
  order.updated_at = new Date().toISOString();
  if (reason) {
    order.note = order.note ? `${order.note} | Lý do hủy: ${reason}` : `Lý do hủy: ${reason}`;
  }

  // Hoàn tồn kho trong một transaction logic
  for (const item of order.items) {
    demoStockMap[item.product_id] = (demoStockMap[item.product_id] ?? 8) + item.quantity;
  }

  return {
    statusCode: 200,
    data: { data: order }
  };
}

// --- LIÊN HỆ & FEEDBACK (docs/API.md dòng 81 & database/001_initial.sql) ---
export interface DemoContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at: string;
}

// Kho tin nhắn liên hệ (dùng chung cho M5 và màn hình Quản trị Admin M6)
export const demoContactMessages: DemoContactMessage[] = [
  {
    id: 'contact-demo-01',
    user_id: 'user-customer-minh',
    name: 'Minh Trần',
    email: 'minh@example.com',
    subject: 'Hợp tác nhà bán/làng nghề',
    message: 'Tôi là đại diện xưởng dệt thổ cẩm Mai Châu muốn tìm hiểu chính sách mở gian hàng trên Làng Mộc.',
    status: 'new',
    created_at: '2026-10-24T10:00:00.000Z'
  },
  {
    id: 'contact-demo-02',
    user_id: 'user-customer-linh',
    name: 'Linh Nguyễn',
    email: 'linh@example.com',
    subject: 'Góp ý website/dịch vụ',
    message: 'Giao diện đặt hàng COD rất mượt mà và dễ dùng. Cảm ơn đội ngũ Làng Mộc!',
    status: 'read',
    created_at: '2026-10-23T15:30:00.000Z'
  }
];

// --- ADMIN CATEGORIES, PRODUCTS & REVIEWS (M6) ---
export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  product_count?: number;
}

export const demoCategories: DemoCategory[] = (catalog.categories as any[]).map(c => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parent_id: null,
  is_active: true,
  product_count: c.product_count ?? 0
}));

export interface DemoProduct {
  id: string;
  seller_id: string | null;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  material: string | null;
  origin_province: string | null;
  price_vnd: number;
  sale_price_vnd: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock_quantity: number;
  status: 'draft' | 'active' | 'hidden';
  created_at: string;
  updated_at: string;
}

export const demoProducts: DemoProduct[] = (catalog.products as any[]).map(p => ({
  id: p.id,
  seller_id: null,
  category_id: p.category_id,
  name: p.name,
  slug: p.slug,
  description: p.description || '',
  material: p.material || null,
  origin_province: p.origin || p.origin_province || null,
  price_vnd: p.price_vnd ?? 100000,
  sale_price_vnd: p.sale_price_vnd ?? null,
  sale_starts_at: null,
  sale_ends_at: null,
  stock_quantity: demoStockMap[p.id] ?? 20,
  status: (p.status as any) || 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

export interface DemoReview {
  id: string;
  product_id: string;
  product_name?: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment: string;
  status: 'pending' | 'visible' | 'hidden';
  created_at: string;
}

export const demoReviews: DemoReview[] = [
  {
    id: 'rev-01',
    product_id: 'khan-quang-co-to-tam-in-hoa-sen-28ec9761',
    product_name: 'Khăn quàng cổ tơ tằm in hoa sen thủ công',
    user_id: 'user-customer-linh',
    user_name: 'Linh Nguyễn',
    rating: 5,
    comment: 'Khăn tơ tằm rất mềm mịn, hoa sen in sắc nét, đóng gói hộp gỗ đẹp mắt.',
    status: 'visible',
    created_at: '2026-10-22T09:00:00.000Z'
  },
  {
    id: 'rev-02',
    product_id: 'balo-phoi-vai-theu-tay-h-mong-d51e21fd',
    product_name: 'Balo thổ cẩm phối vải thêu tay H’Mông',
    user_id: 'user-customer-minh',
    user_name: 'Minh Trần',
    rating: 4,
    comment: 'Balo chắc chắn, hoa văn thêu tay độc đáo nhưng giao hàng hơi chậm một ngày.',
    status: 'pending',
    created_at: '2026-10-24T11:30:00.000Z'
  },
  {
    id: 'rev-03',
    product_id: 'bo-am-chen-men-ran-co-bat-trang-67b14d88',
    product_name: 'Bộ ấm chén men rạn cổ Bát Tràng',
    user_id: 'user-customer-linh',
    user_name: 'Linh Nguyễn',
    rating: 2,
    comment: 'Sản phẩm giao bị sứt nhẹ mép chén, cần kiểm tra lại khâu bọc xốp.',
    status: 'pending',
    created_at: '2026-10-25T14:15:00.000Z'
  }
];

// Bảng theo dõi giới hạn tần suất theo email (CHỈ NẰM TRONG MOCK - MÔ PHỎNG THEO docs/API.md dòng 81)
export const mockContactCooldownMap: Record<string, number> = {};
export const MOCK_RATE_LIMIT_COOLDOWN_MS = 15000; // 15 giây giữa 2 lần gửi

export interface ContactProcessResult {
  statusCode: number;
  data?: { data: DemoContactMessage };
  error?: { error: { code: string; message: string; fields?: Record<string, string> } };
}

export function processContactCreation(
  userId: string | null,
  body: any
): ContactProcessResult {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  const fields: Record<string, string> = {};

  if (!name) {
    fields.name = 'Vui lòng nhập họ và tên.';
  } else if (name.length > 120) {
    fields.name = 'Họ và tên không được vượt quá 120 ký tự (theo đặc tả CSDL).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    fields.email = 'Vui lòng nhập địa chỉ email.';
  } else if (email.length > 255) {
    fields.email = 'Email không được vượt quá 255 ký tự (theo đặc tả CSDL).';
  } else if (!emailRegex.test(email)) {
    fields.email = 'Địa chỉ email không đúng định dạng.';
  }

  if (!subject) {
    fields.subject = 'Vui lòng chọn hoặc nhập chủ đề liên hệ.';
  } else if (subject.length > 160) {
    fields.subject = 'Tiêu đề không được vượt quá 160 ký tự (theo đặc tả CSDL).';
  }

  if (!message) {
    fields.message = 'Vui lòng nhập nội dung tin nhắn hoặc góp ý.';
  }

  if (Object.keys(fields).length > 0) {
    return {
      statusCode: 400,
      error: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu liên hệ không hợp lệ. Vui lòng kiểm tra lại thông tin.',
          fields
        }
      }
    };
  }

  // Kiểm tra giới hạn tần suất (MÔ PHỎNG THEO docs/API.md dòng 81)
  const normEmail = email.toLowerCase();
  const lastSent = mockContactCooldownMap[normEmail] || 0;
  const now = Date.now();
  if (now - lastSent < MOCK_RATE_LIMIT_COOLDOWN_MS) {
    const remainingSec = Math.ceil((MOCK_RATE_LIMIT_COOLDOWN_MS - (now - lastSent)) / 1000);
    return {
      statusCode: 429,
      error: {
        error: {
          code: 'RATE_LIMITED',
          message: `Bạn đang gửi liên hệ quá nhanh. Vui lòng đợi ${remainingSec} giây trước khi gửi tiếp (Cơ chế giới hạn tần suất - MÔ PHỎNG).`
        }
      }
    };
  }

  // Cập nhật mốc thời gian cooldown
  mockContactCooldownMap[normEmail] = now;

  const newMsg: DemoContactMessage = {
    id: 'contact-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    user_id: userId || null, // null nếu khách vãng lai, string nếu đã đăng nhập
    name,
    email: normEmail,
    subject,
    message,
    status: 'new',
    created_at: new Date().toISOString()
  };

  demoContactMessages.push(newMsg);

  return {
    statusCode: 201,
    data: { data: newMsg }
  };
}

export interface OrderProcessResult {
  statusCode: number;
  data?: { data: DemoOrder };
  error?: { error: { code: string; message: string; fields?: Record<string, string> } };
}

export function processOrderCreation(
  userId: string,
  idempotencyKey: string | null | undefined,
  body: any
): OrderProcessResult {
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    return {
      statusCode: 400,
      error: { error: { code: 'VALIDATION_ERROR', message: 'Thiếu header Idempotency-Key trong yêu cầu tạo đơn.' } }
    };
  }

  // 1. Kiểm tra Idempotency-Key đã tồn tại của user trước (xử lý retry khi giỏ đã bị dọn)
  const userKeyMap = mockIdempotencyMap[userId] || {};
  if (userKeyMap[idempotencyKey]) {
    const stored = userKeyMap[idempotencyKey];
    const incomingAddrId = (body?.address_id || '').trim();
    const incomingPromo = (body?.promotion_code || '').trim().toUpperCase();
    const incomingNote = (body?.note || '').trim();

    const storedAddrId = (stored.address_id || '').trim();
    const storedPromo = (stored.order.promotion_code || '').trim().toUpperCase();
    const storedNote = (stored.order.note || '').trim();

    if (incomingAddrId === storedAddrId && incomingPromo === storedPromo && incomingNote === storedNote) {
      // Retry cùng key + cùng nội dung: trả lại đơn cũ, không tạo đơn mới, không trừ tồn lần hai
      return {
        statusCode: 200,
        data: { data: stored.order }
      };
    } else {
      // Cùng key nhưng khác nội dung: từ chối 409 CONFLICT
      return {
        statusCode: 409,
        error: {
          error: {
            code: 'CONFLICT',
            message: 'Khóa giao dịch Idempotency-Key đã được sử dụng với nội dung đơn hàng khác.'
          }
        }
      };
    }
  }

  // 2. Kiểm tra giỏ hàng
  const userCart = demoCartItems.filter(c => c.user_id === userId);
  if (userCart.length === 0) {
    return {
      statusCode: 400,
      error: { error: { code: 'VALIDATION_ERROR', message: 'Giỏ hàng của bạn đang trống, không thể tạo đơn hàng.' } }
    };
  }

  const normalizedItems = userCart
    .map(c => ({ id: String(c.product_id), quantity: Number(c.quantity) }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const fingerprint = JSON.stringify({
    items: normalizedItems,
    address_id: (body?.address_id || '').trim(),
    promotion_code: (body?.promotion_code || '').trim().toUpperCase(),
    note: (body?.note || '').trim()
  });

  // Validate address_id
  const addr = demoAddresses.find(a => a.id === body?.address_id && a.user_id === userId);
  if (!addr) {
    return {
      statusCode: 400,
      error: { error: { code: 'VALIDATION_ERROR', message: 'Địa chỉ nhận hàng không hợp lệ hoặc không thuộc tài khoản của bạn.' } }
    };
  }

  // Validate payment_method
  if (body?.payment_method !== 'cod') {
    return {
      statusCode: 400,
      error: { error: { code: 'VALIDATION_ERROR', message: 'Hiện tại hệ thống chỉ hỗ trợ phương thức thanh toán khi nhận hàng (COD).' } }
    };
  }

  // Check tồn kho
  for (const c of userCart) {
    const stock = getStockForProduct(c.product_id);
    if (c.quantity > stock) {
      const p = (catalog.products as any[]).find(prod => prod.id === c.product_id);
      return {
        statusCode: 409,
        error: {
          error: {
            code: 'CONFLICT',
            message: `Sản phẩm '${p?.name || c.product_id}' không đủ tồn kho (chỉ còn ${stock} món, bạn đặt ${c.quantity}).`
          }
        }
      };
    }
  }

  // Check mã giảm giá
  const code = body?.promotion_code ? String(body.promotion_code).trim().toUpperCase() : null;
  const itemsWithPrice = userCart.map(c => {
    const p = (catalog.products as any[]).find(prod => prod.id === c.product_id);
    const price = p?.current_price_vnd ?? p?.price_vnd ?? 0;
    return { ...c, product: p, price };
  });

  const subtotal_vnd = itemsWithPrice.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping_fee_vnd = subtotal_vnd > 0 ? 30000 : 0;
  let discount_vnd = 0;

  if (code) {
    if (code === 'LANGMOC10') {
      discount_vnd = Math.min(Math.round(subtotal_vnd * 0.1), 50000);
    } else if (code === 'HEHAN') {
      return {
        statusCode: 409,
        error: { error: { code: 'CONFLICT', message: 'Mã giảm giá HEHAN đã hết hạn sử dụng.' } }
      };
    } else {
      return {
        statusCode: 404,
        error: { error: { code: 'NOT_FOUND', message: 'Mã giảm giá không hợp lệ hoặc không tồn tại.' } }
      };
    }
  }

  const total_vnd = Math.max(0, subtotal_vnd - discount_vnd + shipping_fee_vnd);
  const orderId = 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const orderNumber = generateOrderNumber();

  const snapshotItems: DemoOrderItem[] = itemsWithPrice.map(item => ({
    id: 'item-' + Math.random().toString(36).slice(2, 8),
    order_id: orderId,
    product_id: item.product_id,
    product_name: item.product?.name || 'Sản phẩm thủ công Làng Mộc',
    product_image_url: item.product?.images?.[0]?.url || null,
    unit_price_vnd: item.price,
    quantity: item.quantity,
    line_total_vnd: item.price * item.quantity
  }));

  const newOrder: DemoOrder = {
    id: orderId,
    order_number: orderNumber,
    user_id: userId,
    recipient_name: addr.full_name,
    phone: addr.phone,
    shipping_address: `${addr.street_address}, ${addr.ward}, ${addr.district}, ${addr.province}`,
    note: body?.note ? String(body.note).trim() : null,
    status: 'pending',
    payment_method: 'cod',
    payment_status: 'unpaid',
    subtotal_vnd,
    discount_vnd,
    shipping_fee_vnd,
    total_vnd,
    promotion_code: code || null,
    idempotency_key: idempotencyKey,
    items: snapshotItems,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Trừ tồn kho
  for (const c of userCart) {
    demoStockMap[c.product_id] = Math.max(0, getStockForProduct(c.product_id) - c.quantity);
  }

  // Dọn sạch giỏ hàng của user trên server
  for (let i = demoCartItems.length - 1; i >= 0; i--) {
    if (demoCartItems[i].user_id === userId) {
      demoCartItems.splice(i, 1);
    }
  }

  // Lưu đơn và idempotency map
  demoOrders.push(newOrder);
  mockIdempotencyMap[userId] = mockIdempotencyMap[userId] || {};
  mockIdempotencyMap[userId][idempotencyKey] = {
    fingerprint,
    address_id: (body?.address_id || '').trim(),
    order: newOrder
  };

  return {
    statusCode: 201,
    data: { data: newOrder }
  };
}

// Helper đọc body JSON từ IncomingMessage
function parseBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Helper lấy userId từ cookie vc_session
function getSessionUserId(req: any): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/vc_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function handleC2Mock(req: any, res: any, url: URL, send: (code: number, data: unknown) => void): Promise<boolean> {
  const path = decodeURIComponent(url.pathname.replace('/api/v1', ''));
  const method = req.method;

  if (path === '/admin' || path.startsWith('/admin/')) {
    const userId = getSessionUserId(req);
    const user = userId ? demoUsers.find(u => u.id === userId) : null;
    if (!user) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập' } });
      return true;
    }
    if (user.role !== 'admin') {
      send(403, { error: { code: 'FORBIDDEN', message: 'Không có quyền' } });
      return true;
    }

    const orderListMatch = path === '/admin/orders' && method === 'GET';
    const orderDetailMatch = path.match(/^\/admin\/orders\/([^/]+)$/);
    const orderStatusMatch = path.match(/^\/admin\/orders\/([^/]+)\/status$/);
    const shipmentMatch = path.match(/^\/admin\/orders\/([^/]+)\/shipment$/);

    if (orderListMatch) {
      const status = url.searchParams.get('status');
      const page = Number(url.searchParams.get('page') || '1');
      const limit = Number(url.searchParams.get('limit') || '12');
      if ((status && !isOrderStatus(status)) || !Number.isInteger(page) || page < 1 ||
          !Number.isInteger(limit) || limit < 1 || limit > 100) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Bộ lọc hoặc phân trang không hợp lệ.' } });
        return true;
      }
      const matching = demoOrders
        .filter(order => !status || order.status === status)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      send(200, {
        data: matching.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: matching.length }
      });
      return true;
    }

    if (orderDetailMatch && method === 'GET') {
      const orderId = orderDetailMatch[1];
      const order = demoOrders.find(item => item.id === orderId || item.order_number === orderId);
      if (!order) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' } });
      } else {
        send(200, { data: order });
      }
      return true;
    }

    if (orderStatusMatch && method === 'PATCH') {
      const order = demoOrders.find(item => item.id === orderStatusMatch[1] || item.order_number === orderStatusMatch[1]);
      if (!order) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' } });
        return true;
      }
      const body = await parseBody(req);
      const nextStatus = body?.status;
      if (typeof nextStatus !== 'string' || !isOrderStatus(nextStatus)) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Trạng thái đơn hàng không hợp lệ.', fields: { status: 'Trạng thái không hợp lệ' } } });
        return true;
      }
      if (nextStatus === 'cancelled' || !isValidTransition(order.status, nextStatus)) {
        send(409, { error: { code: 'CONFLICT', message: `Không thể chuyển từ ${order.status} sang ${nextStatus}.` } });
        return true;
      }
      if (nextStatus === 'shipping' && !order.shipment) {
        send(409, { error: { code: 'CONFLICT', message: 'Cần lưu thông tin vận đơn trước khi chuyển sang shipping.' } });
        return true;
      }
      order.status = nextStatus;
      order.updated_at = new Date().toISOString();
      if (nextStatus === 'delivered' && order.shipment) {
        order.shipment.delivered_at = order.updated_at;
      }
      send(200, { data: order });
      return true;
    }

    if (shipmentMatch && method === 'PATCH') {
      const order = demoOrders.find(item => item.id === shipmentMatch[1] || item.order_number === shipmentMatch[1]);
      if (!order) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu' } });
        return true;
      }
      const body = await parseBody(req);
      const fields: Record<string, string> = {};
      if (typeof body?.carrier !== 'string' || body.carrier.length > 80) {
        fields.carrier = 'Đơn vị vận chuyển phải là văn bản tối đa 80 ký tự.';
      }
      if (typeof body?.tracking_number !== 'string' || body.tracking_number.length > 100) {
        fields.tracking_number = 'Mã vận đơn phải là văn bản tối đa 100 ký tự.';
      }
      if (Object.keys(fields).length) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu vận đơn không hợp lệ.', fields } });
        return true;
      }
      order.shipment = {
        carrier: body.carrier,
        tracking_number: body.tracking_number,
        shipped_at: order.shipment?.shipped_at || null,
        delivered_at: order.shipment?.delivered_at || null
      };
      order.updated_at = new Date().toISOString();
      send(200, { data: order });
      return true;
    }

    // --- CATEGORIES (docs/API.md dòng 90-91) ---
    if (path === '/admin/categories' && method === 'GET') {
      send(200, { data: demoCategories });
      return true;
    }

    if (path === '/admin/categories' && method === 'POST') {
      const body = await parseBody(req);
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
      const fields: Record<string, string> = {};
      if (!name) fields.name = 'Tên danh mục là bắt buộc.';
      else if (name.length > 100) fields.name = 'Tên danh mục không được vượt quá 100 ký tự.';
      if (!slug) fields.slug = 'Đường dẫn (slug) là bắt buộc.';
      else if (slug.length > 120) fields.slug = 'Slug không được vượt quá 120 ký tự.';
      else if (demoCategories.some(c => c.slug === slug)) {
        send(409, { error: { code: 'CONFLICT', message: 'Slug danh mục đã tồn tại.' } });
        return true;
      }
      if (Object.keys(fields).length) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields } });
        return true;
      }
      const newCat: DemoCategory = {
        id: 'cat-' + Date.now().toString(36),
        name,
        slug,
        parent_id: null,
        is_active: body?.is_active ?? true,
        product_count: 0
      };
      demoCategories.push(newCat);
      (catalog.categories as any[]).push(newCat);
      send(201, { data: newCat });
      return true;
    }

    const catPatchMatch = path.match(/^\/admin\/categories\/([^/]+)$/);
    if (catPatchMatch && method === 'PATCH') {
      const catId = catPatchMatch[1];
      const cat = demoCategories.find(c => c.id === catId || c.slug === catId);
      if (!cat) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy danh mục.' } });
        return true;
      }
      const body = await parseBody(req);
      if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name || name.length > 100) {
          send(400, { error: { code: 'VALIDATION_ERROR', message: 'Tên danh mục tối đa 100 ký tự.' } });
          return true;
        }
        cat.name = name;
      }
      if (body.slug !== undefined) {
        const slug = String(body.slug).trim();
        if (!slug || slug.length > 120) {
          send(400, { error: { code: 'VALIDATION_ERROR', message: 'Slug danh mục tối đa 120 ký tự.' } });
          return true;
        }
        if (demoCategories.some(c => c.id !== cat.id && c.slug === slug)) {
          send(409, { error: { code: 'CONFLICT', message: 'Slug danh mục đã tồn tại.' } });
          return true;
        }
        cat.slug = slug;
      }
      if (body.is_active !== undefined) {
        cat.is_active = Boolean(body.is_active);
      }
      // Đồng bộ vào catalog.categories
      const catInCatalog = (catalog.categories as any[]).find(c => c.id === cat.id);
      if (catInCatalog) {
        catInCatalog.name = cat.name;
        catInCatalog.slug = cat.slug;
      }
      send(200, { data: cat });
      return true;
    }

    // --- PRODUCTS (docs/API.md dòng 92-93) ---
    if (path === '/admin/products' && method === 'GET') {
      const catId = url.searchParams.get('category_id');
      const status = url.searchParams.get('status');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
      const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10) || 12);

      let filtered = demoProducts;
      if (catId) filtered = filtered.filter(p => p.category_id === catId);
      if (status) filtered = filtered.filter(p => p.status === status);

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paged = filtered.slice(startIndex, startIndex + limit);

      send(200, {
        data: paged,
        meta: { page, limit, total }
      });
      return true;
    }

    if (path === '/admin/products' && method === 'POST') {
      const body = await parseBody(req);
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
      const category_id = typeof body?.category_id === 'string' ? body.category_id.trim() : '';
      const price_vnd = Number(body?.price_vnd);
      const stock_quantity = Number(body?.stock_quantity ?? 0);
      const fields: Record<string, string> = {};

      if (!name) fields.name = 'Tên sản phẩm là bắt buộc.';
      else if (name.length > 200) fields.name = 'Tên sản phẩm không quá 200 ký tự.';
      if (!slug) fields.slug = 'Đường dẫn (slug) là bắt buộc.';
      else if (slug.length > 220) fields.slug = 'Slug không quá 220 ký tự.';
      else if (demoProducts.some(p => p.slug === slug)) {
        send(409, { error: { code: 'CONFLICT', message: 'Slug sản phẩm đã tồn tại.' } });
        return true;
      }
      if (!category_id) fields.category_id = 'Danh mục là bắt buộc.';
      if (!Number.isInteger(price_vnd) || price_vnd < 0) {
        fields.price_vnd = 'Giá gốc phải là số nguyên không âm.';
      }
      if (body?.sale_price_vnd !== undefined && body?.sale_price_vnd !== null && body?.sale_price_vnd !== '') {
        const sale = Number(body.sale_price_vnd);
        if (!Number.isInteger(sale) || sale < 0 || sale >= price_vnd) {
          fields.sale_price_vnd = 'Giá khuyến mãi phải là số nguyên không âm và nhỏ hơn giá gốc.';
        }
      }
      if (!Number.isInteger(stock_quantity) || stock_quantity < 0) {
        fields.stock_quantity = 'Tồn kho phải là số nguyên không âm.';
      }
      if (body?.material && String(body.material).length > 120) {
        fields.material = 'Chất liệu không quá 120 ký tự.';
      }
      if (body?.origin_province && String(body.origin_province).length > 100) {
        fields.origin_province = 'Tỉnh xuất xứ không quá 100 ký tự.';
      }

      if (Object.keys(fields).length) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu sản phẩm không hợp lệ.', fields } });
        return true;
      }

      const newProduct: DemoProduct = {
        id: slug,
        seller_id: null,
        category_id,
        name,
        slug,
        description: body?.description ? String(body.description).trim() : '',
        material: body?.material ? String(body.material).trim() : null,
        origin_province: body?.origin_province ? String(body.origin_province).trim() : null,
        price_vnd,
        sale_price_vnd: body?.sale_price_vnd != null && body?.sale_price_vnd !== '' ? Number(body.sale_price_vnd) : null,
        sale_starts_at: null,
        sale_ends_at: null,
        stock_quantity,
        status: body?.status === 'draft' || body?.status === 'hidden' ? body.status : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      demoProducts.unshift(newProduct);
      demoStockMap[newProduct.id] = stock_quantity;
      (catalog.products as any[]).unshift(newProduct);

      send(201, { data: newProduct });
      return true;
    }

    const prodPatchMatch = path.match(/^\/admin\/products\/([^/]+)$/);
    if (prodPatchMatch && method === 'PATCH') {
      const prodId = prodPatchMatch[1];
      const product = demoProducts.find(p => p.id === prodId || p.slug === prodId);
      if (!product) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm.' } });
        return true;
      }
      const body = await parseBody(req);
      const fields: Record<string, string> = {};

      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name || name.length > 200) fields.name = 'Tên sản phẩm tối đa 200 ký tự.';
        else product.name = name;
      }
      if (body?.price_vnd !== undefined) {
        const price = Number(body.price_vnd);
        if (!Number.isInteger(price) || price < 0) fields.price_vnd = 'Giá gốc phải là số nguyên không âm.';
        else product.price_vnd = price;
      }
      if (body?.sale_price_vnd !== undefined) {
        if (body.sale_price_vnd === null || body.sale_price_vnd === '') {
          product.sale_price_vnd = null;
        } else {
          const sale = Number(body.sale_price_vnd);
          const currentPrice = body?.price_vnd !== undefined ? Number(body.price_vnd) : product.price_vnd;
          if (!Number.isInteger(sale) || sale < 0 || sale >= currentPrice) {
            fields.sale_price_vnd = 'Giá khuyến mãi phải nhỏ hơn giá gốc.';
          } else {
            product.sale_price_vnd = sale;
          }
        }
      }
      if (body?.stock_quantity !== undefined) {
        const stock = Number(body.stock_quantity);
        if (!Number.isInteger(stock) || stock < 0) fields.stock_quantity = 'Tồn kho phải là số nguyên không âm.';
        else {
          product.stock_quantity = stock;
          demoStockMap[product.id] = stock;
        }
      }
      if (body?.status !== undefined) {
        if (['draft', 'active', 'hidden'].includes(body.status)) {
          product.status = body.status;
        } else {
          fields.status = 'Trạng thái không hợp lệ.';
        }
      }
      if (body?.description !== undefined) {
        product.description = String(body.description).trim();
      }
      if (body?.material !== undefined) {
        product.material = body.material ? String(body.material).trim() : null;
      }
      if (body?.origin_province !== undefined) {
        product.origin_province = body.origin_province ? String(body.origin_province).trim() : null;
      }

      if (Object.keys(fields).length) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu cập nhật không hợp lệ.', fields } });
        return true;
      }

      product.updated_at = new Date().toISOString();

      // Đồng bộ sang catalog.products của storefront
      const catP = (catalog.products as any[]).find(p => p.id === product.id || p.slug === product.slug);
      if (catP) {
        catP.name = product.name;
        catP.price_vnd = product.price_vnd;
        catP.sale_price_vnd = product.sale_price_vnd;
        catP.current_price_vnd = product.sale_price_vnd ?? product.price_vnd;
        catP.status = product.status;
      }

      send(200, { data: product });
      return true;
    }

    // --- REVIEWS (docs/API.md dòng 99) ---
    if (path === '/admin/reviews' && method === 'GET') {
      const status = url.searchParams.get('status');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
      const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10) || 12);

      let filtered = demoReviews;
      if (status && status !== 'all') {
        filtered = filtered.filter(r => r.status === status);
      }

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paged = filtered.slice(startIndex, startIndex + limit);

      send(200, {
        data: paged,
        meta: { page, limit, total }
      });
      return true;
    }

    const revPatchMatch = path.match(/^\/admin\/reviews\/([^/]+)$/);
    if (revPatchMatch && method === 'PATCH') {
      const revId = revPatchMatch[1];
      const rev = demoReviews.find(r => r.id === revId);
      if (!rev) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy đánh giá.' } });
        return true;
      }
      const body = await parseBody(req);
      if (!body?.status || !['visible', 'hidden'].includes(body.status)) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Trạng thái duyệt review phải là visible hoặc hidden.' } });
        return true;
      }
      rev.status = body.status;
      send(200, { data: rev });
      return true;
    }

    // --- CONTACT MESSAGES (docs/API.md dòng 100) ---
    if (path === '/admin/contact' && method === 'GET') {
      const status = url.searchParams.get('status');
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
      const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10) || 12);

      let filtered = demoContactMessages;
      if (status && status !== 'all') {
        filtered = filtered.filter(m => m.status === status);
      }

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paged = filtered.slice(startIndex, startIndex + limit);

      send(200, {
        data: paged,
        meta: { page, limit, total }
      });
      return true;
    }

    const contactPatchMatch = path.match(/^\/admin\/contact\/([^/]+)$/);
    if (contactPatchMatch && method === 'PATCH') {
      const contactId = contactPatchMatch[1];
      const msg = demoContactMessages.find(m => m.id === contactId);
      if (!msg) {
        send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy tin nhắn liên hệ.' } });
        return true;
      }
      const body = await parseBody(req);
      if (!body?.status || !['read', 'resolved'].includes(body.status)) {
        send(400, { error: { code: 'VALIDATION_ERROR', message: 'Trạng thái xử lý phải là read hoặc resolved.' } });
        return true;
      }
      msg.status = body.status;
      send(200, { data: msg });
      return true;
    }

    send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint.' } });
    return true;
  }

  // --- AUTH ENDPOINTS ---
  if (path === '/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    const { full_name, email, password, phone } = body || {};

    if (!full_name || !email || !password) {
      send(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Họ tên, email và mật khẩu là bắt buộc.',
          fields: {
            ...(!full_name ? { full_name: 'Vui lòng nhập họ và tên' } : {}),
            ...(!email ? { email: 'Vui lòng nhập email hợp lệ' } : {}),
            ...(!password ? { password: 'Vui lòng nhập mật khẩu' } : {})
          }
        }
      });
      return true;
    }

    if (password.length < 6) {
      send(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Mật khẩu phải có ít nhất 6 ký tự.',
          fields: { password: 'Mật khẩu phải có ít nhất 6 ký tự' }
        }
      });
      return true;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (demoUsers.some(u => u.email.toLowerCase() === normalizedEmail)) {
      send(409, {
        error: {
          code: 'CONFLICT',
          message: 'Email này đã được đăng ký trên hệ thống. Vui lòng đăng nhập hoặc dùng email khác.'
        }
      });
      return true;
    }

    const newUser: DemoUser = {
      id: 'user-' + Date.now(),
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      password: String(password),
      role: 'customer',
      phone: phone ? String(phone).trim() : null
    };
    demoUsers.push(newUser);

    // Thiết lập cookie phiên
    res.setHeader('Set-Cookie', `vc_session=${encodeURIComponent(newUser.id)}; Path=/; SameSite=Lax`);
    const { password: _, ...userProfile } = newUser;
    send(201, { data: userProfile });
    return true;
  }

  if (path === '/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body || {};

    if (!email || !password) {
      send(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng nhập đầy đủ email và mật khẩu.',
          fields: {
            ...(!email ? { email: 'Vui lòng nhập email' } : {}),
            ...(!password ? { password: 'Vui lòng nhập mật khẩu' } : {})
          }
        }
      });
      return true;
    }

    const user = demoUsers.find(
      u => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === String(password)
    );

    if (!user) {
      send(401, {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Email hoặc mật khẩu không chính xác.'
        }
      });
      return true;
    }

    res.setHeader('Set-Cookie', `vc_session=${encodeURIComponent(user.id)}; Path=/; SameSite=Lax`);
    const { password: _, ...userProfile } = user;
    send(200, { data: userProfile });
    return true;
  }

  if (path === '/auth/logout' && method === 'POST') {
    res.setHeader('Set-Cookie', 'vc_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.statusCode = 204;
    res.setHeader('X-Lang-Moc-Data', 'mock');
    res.end();
    return true;
  }

  if (path === '/auth/me' && method === 'GET') {
    const userId = getSessionUserId(req);
    const user = userId ? demoUsers.find(u => u.id === userId) : null;
    if (!user) {
      send(401, {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Vui lòng đăng nhập'
        }
      });
      return true;
    }
    const { password: _, ...userProfile } = user;
    send(200, { data: userProfile });
    return true;
  }

  // --- ADDRESSES ENDPOINTS (chỉ GET và POST theo docs/API.md) ---
  if (path === '/me/addresses' && method === 'GET') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, {
        error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập' }
      });
      return true;
    }
    const list = demoAddresses.filter(a => a.user_id === userId);
    send(200, { data: list });
    return true;
  }

  if (path === '/me/addresses' && method === 'POST') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, {
        error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập' }
      });
      return true;
    }
    const body = await parseBody(req);
    const { full_name, phone, province, district, ward, street_address, is_default } = body || {};

    if (!full_name || !phone || !province || !district || !ward || !street_address) {
      send(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Vui lòng điền đầy đủ các thông tin địa chỉ bắt buộc.',
          fields: {
            ...(!full_name ? { full_name: 'Vui lòng nhập họ tên người nhận' } : {}),
            ...(!phone ? { phone: 'Vui lòng nhập số điện thoại' } : {}),
            ...(!province ? { province: 'Vui lòng chọn tỉnh/thành phố' } : {}),
            ...(!district ? { district: 'Vui lòng chọn quận/huyện' } : {}),
            ...(!ward ? { ward: 'Vui lòng chọn phường/xã' } : {}),
            ...(!street_address ? { street_address: 'Vui lòng nhập địa chỉ chi tiết' } : {})
          }
        }
      });
      return true;
    }

    const newAddr: DemoAddress = {
      id: 'addr-' + Date.now(),
      user_id: userId,
      full_name: String(full_name).trim(),
      phone: String(phone).trim(),
      province: String(province).trim(),
      district: String(district).trim(),
      ward: String(ward).trim(),
      street_address: String(street_address).trim(),
      is_default: Boolean(is_default),
      created_at: new Date().toISOString()
    };

    if (newAddr.is_default) {
      demoAddresses.forEach(a => {
        if (a.user_id === userId) a.is_default = false;
      });
    }

    demoAddresses.unshift(newAddr);
    send(201, { data: newAddr });
    return true;
  }

  // --- CART ENDPOINTS (docs/API.md dòng 47-50) ---
  if (path === '/me/cart' && method === 'GET') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập' } });
      return true;
    }

    const userCart = demoCartItems.filter(c => c.user_id === userId);
    const items = userCart.map(c => {
      const p = (catalog.products as any[]).find(prod => prod.id === c.product_id);
      const stock = getStockForProduct(c.product_id);
      const price = p?.current_price_vnd ?? p?.price_vnd ?? null;
      return {
        product_id: c.product_id,
        product_slug: p?.slug || '',
        product_name: p?.name || 'Sản phẩm',
        image_url: p?.images?.[0]?.url || '',
        price_vnd: price,
        quantity: c.quantity,
        stock_quantity: stock,
        origin: p?.origin || null,
        price_is_demo: p?.price_is_demo
      };
    });

    const subtotal_vnd = items.reduce((s, x) => s + (x.price_vnd || 0) * x.quantity, 0);
    send(200, { data: { items, subtotal_vnd } });
    return true;
  }

  const cartItemMatch = path.match(/^\/me\/cart\/items\/([^/]+)$/);
  if (cartItemMatch) {
    const productId = decodeURIComponent(cartItemMatch[1]);
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập' } });
      return true;
    }

    if (method === 'PUT') {
      const body = await parseBody(req);
      const quantity = Number(body?.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        send(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Số lượng phải là số nguyên dương lớn hơn 0.'
          }
        });
        return true;
      }

      const product = (catalog.products as any[]).find(p => p.id === productId);
      if (!product) {
        send(404, {
          error: {
            code: 'NOT_FOUND',
            message: 'Không tìm thấy sản phẩm.'
          }
        });
        return true;
      }

      const stock = getStockForProduct(productId);
      if (quantity > stock) {
        send(409, {
          error: {
            code: 'CONFLICT',
            message: `Số lượng yêu cầu (${quantity}) vượt quá tồn kho hiện có (${stock} món).`
          }
        });
        return true;
      }

      let existing = demoCartItems.find(c => c.user_id === userId && c.product_id === productId);
      if (existing) {
        existing.quantity = quantity;
      } else {
        existing = { user_id: userId, product_id: productId, quantity };
        demoCartItems.push(existing);
      }

      const price = product.current_price_vnd ?? product.price_vnd ?? null;
      send(200, {
        data: {
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name,
          image_url: product.images?.[0]?.url || '',
          price_vnd: price,
          quantity,
          stock_quantity: stock,
          origin: product.origin || null,
          price_is_demo: product.price_is_demo
        }
      });
      return true;
    }

    if (method === 'DELETE') {
      const idx = demoCartItems.findIndex(c => c.user_id === userId && c.product_id === productId);
      if (idx !== -1) {
        demoCartItems.splice(idx, 1);
      }
      res.statusCode = 204;
      res.setHeader('X-Lang-Moc-Data', 'mock');
      res.end();
      return true;
    }
  }

  // --- CHECKOUT PREVIEW ENDPOINT (docs/API.md dòng 50) ---
  if (path === '/checkout/preview' && method === 'POST') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để xem trước đơn hàng.' } });
      return true;
    }

    const body = await parseBody(req);
    const userCart = demoCartItems.filter(c => c.user_id === userId);

    const items = userCart.map(c => {
      const p = (catalog.products as any[]).find(prod => prod.id === c.product_id);
      const price = p?.current_price_vnd ?? p?.price_vnd ?? 0;
      return { ...c, price };
    });

    const subtotal_vnd = items.reduce((s, x) => s + x.price * x.quantity, 0);
    const shipping_fee_vnd = subtotal_vnd > 0 ? 30000 : 0;
    let discount_vnd = 0;
    let promoValid = false;
    let promoMsg = '';

    const code = body?.promotion_code ? String(body.promotion_code).trim().toUpperCase() : null;
    if (code) {
      if (code === 'LANGMOC10') {
        discount_vnd = Math.min(Math.round(subtotal_vnd * 0.1), 50000);
        promoValid = true;
        promoMsg = 'Áp dụng mã LANGMOC10 thành công (giảm 10%, tối đa 50.000 đ)';
      } else if (code === 'HEHAN') {
        send(409, {
          error: {
            code: 'CONFLICT',
            message: 'Mã giảm giá HEHAN đã hết hạn sử dụng.'
          }
        });
        return true;
      } else {
        send(404, {
          error: {
            code: 'NOT_FOUND',
            message: 'Mã giảm giá không hợp lệ hoặc không tồn tại.'
          }
        });
        return true;
      }
    }

    const total_vnd = Math.max(0, subtotal_vnd - discount_vnd + shipping_fee_vnd);
    send(200, {
      data: {
        subtotal_vnd,
        discount_vnd,
        shipping_fee_vnd,
        total_vnd,
        promotion_code: code,
        promotion_discount_vnd: discount_vnd,
        promotion_valid: promoValid,
        promotion_message: promoMsg || undefined
      }
    });
    return true;
  }

  // --- ORDERS ENDPOINTS (docs/API.md dòng 51-53) ---
  if (path === '/orders' && method === 'POST') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để tiến hành đặt hàng.' } });
      return true;
    }

    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
    const body = await parseBody(req);
    const result = processOrderCreation(userId, idempotencyKey, body);

    if (result.error) {
      send(result.statusCode, result.error);
    } else {
      send(result.statusCode, result.data);
    }
    return true;
  }

  if (path === '/me/orders' && method === 'GET') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để xem lịch sử đơn hàng.' } });
      return true;
    }

    const statusFilter = url.searchParams.get('status')?.trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10);

    let userOrders = demoOrders
      .filter(o => o.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (statusFilter && statusFilter !== 'all') {
      userOrders = userOrders.filter(o => o.status === statusFilter);
    }

    const total = userOrders.length;
    const startIndex = (page - 1) * limit;
    const pagedOrders = userOrders.slice(startIndex, startIndex + limit);

    send(200, {
      data: pagedOrders,
      meta: {
        page,
        limit,
        total
      }
    });
    return true;
  }

  // POST /me/orders/:id/cancel (docs/API.md dòng 54)
  if (path.startsWith('/me/orders/') && path.endsWith('/cancel') && method === 'POST') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để thực hiện thao tác này.' } });
      return true;
    }

    const orderId = path.replace('/me/orders/', '').replace(/\/cancel$/, '').trim();
    const body = await parseBody(req);
    const result = cancelOrder(userId, orderId, body?.reason);

    if (result.error) {
      send(result.statusCode, result.error);
    } else {
      send(result.statusCode, result.data);
    }
    return true;
  }

  // GET /me/orders/:id (docs/API.md dòng 53)
  if (path.startsWith('/me/orders/') && method === 'GET') {
    const userId = getSessionUserId(req);
    if (!userId || !demoUsers.some(u => u.id === userId)) {
      send(401, { error: { code: 'UNAUTHENTICATED', message: 'Vui lòng đăng nhập để xem chi tiết đơn hàng.' } });
      return true;
    }

    const orderId = path.replace('/me/orders/', '').trim();
    const order = demoOrders.find(o => (o.id === orderId || o.order_number === orderId) && o.user_id === userId);

    if (!order) {
      send(404, { error: { code: 'NOT_FOUND', message: 'Không tìm thấy thông tin đơn hàng yêu cầu.' } });
      return true;
    }

    send(200, { data: order });
    return true;
  }

  // --- CONTACT ENDPOINT (docs/API.md dòng 81) ---
  if (path === '/contact' && method === 'POST') {
    const userId = getSessionUserId(req); // null nếu vãng lai, string nếu có phiên
    const body = await parseBody(req);
    const result = processContactCreation(userId, body);

    if (result.error) {
      send(result.statusCode, result.error);
    } else {
      send(result.statusCode, result.data);
    }
    return true;
  }

  return false;
}
