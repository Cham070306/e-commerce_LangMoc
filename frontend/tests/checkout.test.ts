import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOrderFingerprint,
  getIdempotencyKey,
  clearIdempotencyKey,
  type CheckoutFingerprintInput
} from '../src/features/checkout/idempotency.ts';
import {
  processOrderCreation,
  demoCartItems,
  demoOrders,
  mockIdempotencyMap,
  demoStockMap,
  getStockForProduct
} from '../mock/c2Mock.ts';

// Mock in-memory Storage cho môi trường Node test
function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] || null,
    length: 0
  };
}

test('(a) Idempotency-Key: Cùng dấu vân tay giữ nguyên key khi gọi lại', () => {
  const storage = createMemoryStorage();
  const input1: CheckoutFingerprintInput = {
    items: [{ id: 'prod-01', quantity: 2 }, { id: 'prod-02', quantity: 1 }],
    address_id: 'addr-demo-01',
    promotion_code: 'LANGMOC10',
    note: 'Giao giờ hành chính'
  };

  const res1 = getIdempotencyKey(input1, storage);
  assert.equal(res1.isNew, true);
  assert.ok(res1.key && res1.key.length > 10);

  // Gọi lại với cùng nội dung (dù thứ tự items truyền vào khác nhau)
  const inputSame: CheckoutFingerprintInput = {
    items: [{ id: 'prod-02', quantity: 1 }, { id: 'prod-01', quantity: 2 }],
    address_id: 'addr-demo-01',
    promotion_code: 'langmoc10', // không phân biệt hoa thường
    note: 'Giao giờ hành chính'
  };
  const res2 = getIdempotencyKey(inputSame, storage);
  assert.equal(res2.isNew, false);
  assert.equal(res2.key, res1.key, 'Cùng dấu vân tay phải giữ nguyên key cũ');
});

test('(a) Idempotency-Key: Đổi nội dung đơn hàng thì sinh key mới', () => {
  const storage = createMemoryStorage();
  const input1: CheckoutFingerprintInput = {
    items: [{ id: 'prod-01', quantity: 2 }],
    address_id: 'addr-demo-01',
    promotion_code: null,
    note: ''
  };

  const res1 = getIdempotencyKey(input1, storage);

  // Đổi số lượng món
  const inputChanged: CheckoutFingerprintInput = {
    items: [{ id: 'prod-01', quantity: 3 }],
    address_id: 'addr-demo-01',
    promotion_code: null,
    note: ''
  };
  const res2 = getIdempotencyKey(inputChanged, storage);
  assert.equal(res2.isNew, true);
  assert.notEqual(res2.key, res1.key, 'Đổi nội dung đơn phải sinh key mới');
});

test('(a) Idempotency-Key: Xóa key sau khi đặt thành công thì lần sau sinh key mới', () => {
  const storage = createMemoryStorage();
  const input: CheckoutFingerprintInput = {
    items: [{ id: 'prod-01', quantity: 1 }],
    address_id: 'addr-demo-01'
  };

  const res1 = getIdempotencyKey(input, storage);
  clearIdempotencyKey(storage);

  const res2 = getIdempotencyKey(input, storage);
  assert.equal(res2.isNew, true);
  assert.notEqual(res2.key, res1.key);
});

test('(b) Logic Mock: Thiếu header Idempotency-Key bị từ chối 400 VALIDATION_ERROR', () => {
  const res = processOrderCreation('user-customer-linh', null, { address_id: 'addr-demo-01', payment_method: 'cod' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.error?.error?.code, 'VALIDATION_ERROR');
});

test('(b) Logic Mock: Giỏ rỗng bị từ chối 400 VALIDATION_ERROR', () => {
  // Xóa giỏ user nếu có
  const userId = 'user-test-empty';
  demoCartItems.splice(0, demoCartItems.length);

  const res = processOrderCreation(userId, 'key-test-empty', { address_id: 'addr-demo-01', payment_method: 'cod' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.error?.error?.code, 'VALIDATION_ERROR');
});

test('(b) Logic Mock: Vượt tồn kho bị từ chối 409 CONFLICT', () => {
  const userId = 'user-customer-linh';
  const testProdId = 'khan-quang-co-to-tam-in-hoa-sen-28ec9761'; // tồn kho = 2
  demoStockMap[testProdId] = 2;

  demoCartItems.splice(0, demoCartItems.length);
  demoCartItems.push({ user_id: userId, product_id: testProdId, quantity: 5 }); // đặt 5 > 2

  const res = processOrderCreation(userId, 'key-test-overstock', { address_id: 'addr-demo-01', payment_method: 'cod' });
  assert.equal(res.statusCode, 409);
  assert.equal(res.error?.error?.code, 'CONFLICT');
});

test('(b) Logic Mock: Tạo đơn COD thành công (trả mã LM-, trừ tồn kho 1 lần, dọn giỏ)', () => {
  const userId = 'user-customer-linh';
  const testProdId = 'balo-phoi-vai-theu-tay-h-mong-d51e21fd';
  demoStockMap[testProdId] = 10;

  demoCartItems.splice(0, demoCartItems.length);
  demoCartItems.push({ user_id: userId, product_id: testProdId, quantity: 2 });

  const idempotencyKey = 'key-test-success-01';
  const res = processOrderCreation(userId, idempotencyKey, {
    address_id: 'addr-demo-01',
    payment_method: 'cod',
    note: 'Hàng dễ vỡ'
  });

  assert.equal(res.statusCode, 201);
  assert.ok(res.data?.data);
  const order = res.data.data;
  assert.ok(order.order_number.startsWith('LM-'), 'Mã đơn phải có tiền tố LM-');
  assert.equal(order.payment_method, 'cod');
  assert.equal(order.status, 'pending');
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 2);

  // Tồn kho phải bị trừ 2
  assert.equal(demoStockMap[testProdId], 8, 'Tồn kho từ 10 phải giảm còn 8');

  // Giỏ hàng của user phải được dọn sạch
  const remainingInCart = demoCartItems.filter(c => c.user_id === userId);
  assert.equal(remainingInCart.length, 0, 'Giỏ hàng user phải rỗng sau khi tạo đơn');
});

test('(b) Logic Mock: Retry cùng Idempotency-Key và cùng nội dung -> trả lại đúng đơn cũ, KHÔNG tạo đơn mới và KHÔNG trừ tồn kho lần hai', () => {
  const userId = 'user-customer-linh';
  const testProdId = 'balo-phoi-vai-theu-tay-h-mong-d51e21fd';
  demoStockMap[testProdId] = 8;

  // Lần gửi lại với cùng key 'key-test-success-01' đã tạo ở test trước
  const initialOrderCount = demoOrders.length;
  const resRetry = processOrderCreation(userId, 'key-test-success-01', {
    address_id: 'addr-demo-01',
    payment_method: 'cod',
    note: 'Hàng dễ vỡ'
  });

  assert.equal(resRetry.statusCode, 200, 'Retry cùng key trả về status 200');
  assert.ok(resRetry.data?.data);
  assert.equal(resRetry.data.data.idempotency_key, 'key-test-success-01');

  // Số lượng đơn hàng trong hệ thống không được tăng
  assert.equal(demoOrders.length, initialOrderCount, 'Không được tạo thêm đơn mới');

  // Tồn kho không được trừ thêm
  assert.equal(demoStockMap[testProdId], 8, 'Tồn kho phải giữ nguyên, không được trừ lần hai');
});

test('(b) Logic Mock: Cùng Idempotency-Key nhưng KHÁC nội dung đơn hàng -> từ chối 409 CONFLICT', () => {
  const userId = 'user-customer-linh';
  const resMismatch = processOrderCreation(userId, 'key-test-success-01', {
    address_id: 'addr-demo-01',
    payment_method: 'cod',
    note: 'Nội dung ghi chú hoàn toàn khác để làm đổi dấu vân tay'
  });

  assert.equal(resMismatch.statusCode, 409);
  assert.equal(resMismatch.error?.error?.code, 'CONFLICT');
});
