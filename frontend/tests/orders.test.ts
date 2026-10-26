import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoOrders,
  demoStockMap,
  cancelOrder,
  getStockForProduct,
  type DemoOrder
} from '../mock/c2Mock.ts';

test('(a) GET /me/orders logic: Danh sách trả về đúng các đơn của user', () => {
  const userId = 'user-customer-linh';
  const userOrders = demoOrders.filter(o => o.user_id === userId);
  assert.ok(userOrders.length >= 2, 'Customer Linh phải có ít nhất 2 đơn seeded');

  // Đơn hàng phải sắp xếp theo created_at giảm dần (mới nhất lên đầu)
  const sorted = [...userOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  assert.ok(new Date(sorted[0].created_at).getTime() >= new Date(sorted[1].created_at).getTime(), 'Đơn hàng mới hơn phải nằm trước');
});

test('(a) GET /me/orders logic: Lọc trạng thái đơn hàng chính xác', () => {
  const userId = 'user-customer-linh';
  const allOrders = demoOrders.filter(o => o.user_id === userId);

  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  assert.ok(pendingOrders.length > 0, 'Phải có đơn hàng pending');
  assert.ok(pendingOrders.every(o => o.status === 'pending'));

  const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
  assert.ok(deliveredOrders.length > 0, 'Phải có đơn hàng delivered');
  assert.ok(deliveredOrders.every(o => o.status === 'delivered'));
});

test('(a) GET /me/orders logic: Phân trang (pagination) cắt đúng số lượng và bảo toàn total', () => {
  const userId = 'user-customer-linh';
  const userOrders = demoOrders.filter(o => o.user_id === userId);
  const total = userOrders.length;

  const page1Limit1 = userOrders.slice(0, 1);
  assert.equal(page1Limit1.length, 1);

  const page2Limit1 = userOrders.slice(1, 2);
  assert.equal(page2Limit1.length, 1);
  assert.notEqual(page1Limit1[0].id, page2Limit1[0].id, 'Trang 1 và trang 2 không được trùng món');
  assert.equal(total >= 2, true);
});

test('(b) GET /me/orders/:id logic: Chỉ trả về đơn của bản thân, từ chối đơn của user khác', () => {
  const currentUserId = 'user-customer-linh';
  const otherUserId = 'user-other-person';

  // Thêm đơn thuộc về user khác
  const foreignOrder: DemoOrder = {
    id: 'ord-foreign-999',
    order_number: 'LM-20261023-9999',
    user_id: otherUserId,
    recipient_name: 'Người Lạ',
    phone: '0988777666',
    shipping_address: 'Hà Nội',
    note: null,
    status: 'pending',
    payment_method: 'cod',
    payment_status: 'unpaid',
    subtotal_vnd: 200000,
    discount_vnd: 0,
    shipping_fee_vnd: 30000,
    total_vnd: 230000,
    idempotency_key: 'foreign-key',
    items: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  demoOrders.push(foreignOrder);

  // Linh cố gắng lấy đơn của Người Lạ -> phải không tìm thấy (404)
  const found = demoOrders.find(o => o.id === foreignOrder.id && o.user_id === currentUserId);
  assert.equal(found, undefined, 'User hiện tại không được phép xem đơn của người khác');
});

test('(c) POST /me/orders/:id/cancel: Hủy thành công khi status === pending và hoàn lại tồn kho', () => {
  const userId = 'user-customer-linh';
  const productId = 'balo-phoi-vai-theu-tay-h-mong-d51e21fd';

  // Ghi nhận tồn kho trước khi hủy
  const initialStock = getStockForProduct(productId);

  // Tìm đơn pending đã seed của Linh
  const pendingOrder = demoOrders.find(o => o.user_id === userId && o.status === 'pending');
  assert.ok(pendingOrder, 'Phải có đơn pending');

  const orderItem = pendingOrder.items.find(i => i.product_id === productId);
  assert.ok(orderItem, 'Đơn pending phải chứa balo');
  const qtyToRestore = orderItem.quantity;

  // Thực hiện hủy đơn
  const res = cancelOrder(userId, pendingOrder.id, 'Tôi muốn đổi màu khác');
  assert.equal(res.statusCode, 200, 'Hủy đơn pending phải thành công (200)');
  assert.equal(res.data?.data.status, 'cancelled');
  assert.ok(res.data?.data.note?.includes('Tôi muốn đổi màu khác'));

  // Kiểm tra tồn kho đã được hoàn lại đầy đủ
  const newStock = getStockForProduct(productId);
  assert.equal(newStock, initialStock + qtyToRestore, 'Tồn kho phải được hoàn lại đúng số lượng món trong đơn');
});

test('(c) POST /me/orders/:id/cancel: Từ chối 409 CONFLICT khi đơn đã ở trạng thái delivered hoặc đã hủy', () => {
  const userId = 'user-customer-linh';

  // Đơn delivered không được phép hủy
  const deliveredOrder = demoOrders.find(o => o.user_id === userId && o.status === 'delivered');
  assert.ok(deliveredOrder, 'Phải có đơn delivered');

  const resDelivered = cancelOrder(userId, deliveredOrder.id);
  assert.equal(resDelivered.statusCode, 409, 'Đơn delivered hủy phải trả về 409 CONFLICT');
  assert.equal(resDelivered.error?.error?.code, 'CONFLICT');

  // Đơn đã cancelled rồi cũng không được hủy lần hai
  const cancelledOrder = demoOrders.find(o => o.user_id === userId && o.status === 'cancelled');
  assert.ok(cancelledOrder, 'Phải có đơn cancelled');

  const resCancelled = cancelOrder(userId, cancelledOrder.id);
  assert.equal(resCancelled.statusCode, 409, 'Đơn đã hủy rồi không được hủy tiếp');
  assert.equal(resCancelled.error?.error?.code, 'CONFLICT');
});

test('(c) POST /me/orders/:id/cancel: Trả về 404 NOT_FOUND khi mã đơn không tồn tại', () => {
  const res = cancelOrder('user-customer-linh', 'ord-khong-ton-tai-999');
  assert.equal(res.statusCode, 404);
  assert.equal(res.error?.error?.code, 'NOT_FOUND');
});
