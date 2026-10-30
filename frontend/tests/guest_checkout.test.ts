import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import {
  demoOrders,
  demoStockMap,
  GUEST_ORDER_PHONE_COOLDOWN_MS,
  guestOrderIdempotencyMap,
  guestOrderRateLimitMap,
  getStockForProduct,
  handleC2Mock,
  processGuestCheckoutPreview,
  processGuestOrderCreation
} from '../mock/c2Mock.ts';
import type { MockGuestCheckoutPayload } from '../src/lib/guestContracts.ts';

const productId = '4b35fd2d-a8ce-5af5-83c5-b49b98dab8a6';

function payload(phone = '0907777666'): MockGuestCheckoutPayload {
  return {
    recipient_name: 'Khách mua thử',
    phone,
    address_line: '12 Đường Thủ Công, phường/xã và tỉnh/thành do khách tự nhập',
    items: [{ product_id: productId, quantity: 1 }],
    note: 'Gọi trước khi giao'
  };
}

test('T5: mock preview tính tổng từ danh sách món, không yêu cầu phiên đăng nhập', () => {
  const result = processGuestCheckoutPreview([{ product_id: productId, quantity: 1 }]);

  assert.equal(result.statusCode, 200);
  assert.ok(result.data?.data.total_vnd > result.data?.data.subtotal_vnd);
  assert.equal(result.data?.data.shipping_fee_vnd, 30000);
});

test('T5: mock chặn giỏ rỗng, điện thoại sai, thiếu địa chỉ và địa chỉ vượt giới hạn', () => {
  const empty = processGuestOrderCreation('guest-empty-key', { ...payload(), items: [] }, 1_000_000);
  assert.equal(empty.statusCode, 400);
  assert.ok(empty.error?.error.fields?.items);

  const badPhone = processGuestOrderCreation('guest-phone-key', payload('+84907777666'), 1_000_000);
  assert.equal(badPhone.statusCode, 400);
  assert.ok(badPhone.error?.error.fields?.phone);

  const missingAddress = processGuestOrderCreation('guest-address-key', { ...payload(), address_line: '' }, 1_000_000);
  assert.equal(missingAddress.statusCode, 400);
  assert.ok(missingAddress.error?.error.fields?.address_line);

  const longAddress = processGuestOrderCreation('guest-long-address-key', { ...payload(), address_line: 'A'.repeat(256) }, 1_000_000);
  assert.equal(longAddress.statusCode, 400);
  assert.ok(longAddress.error?.error.fields?.address_line);
});

test('T5: tạo đơn khách COD lưu snapshot và retry cùng key chỉ tạo một đơn/trừ tồn một lần', () => {
  const key = `guest-idempotency-${Date.now()}`;
  const guestPayload = payload('0907777667');
  const originalStock = demoStockMap[productId];
  const stockBefore = getStockForProduct(productId);
  let createdOrderId: string | undefined;

  try {
    demoStockMap[productId] = 5;
    const first = processGuestOrderCreation(key, guestPayload, 2_000_000);
    assert.equal(first.statusCode, 201);
    const order = first.data?.data;
    assert.ok(order);
    createdOrderId = order.id;
    assert.equal(order.user_id, null);
    assert.equal(order.recipient_name, guestPayload.recipient_name);
    assert.equal(order.shipping_address, guestPayload.address_line);
    assert.equal(order.payment_method, 'cod');
    assert.equal(demoStockMap[productId], 4);

    const retry = processGuestOrderCreation(key, guestPayload, 2_000_001);
    assert.equal(retry.statusCode, 200);
    assert.equal(retry.data?.data.id, order.id);
    assert.equal(demoStockMap[productId], 4);

    const changed = processGuestOrderCreation(key, { ...guestPayload, address_line: '14 Đường Thủ Công' }, 2_000_002);
    assert.equal(changed.statusCode, 409);
  } finally {
    delete guestOrderIdempotencyMap[key];
    delete guestOrderRateLimitMap[guestPayload.phone];
    if (createdOrderId) {
      const index = demoOrders.findIndex(order => order.id === createdOrderId);
      if (index >= 0) demoOrders.splice(index, 1);
    }
    if (originalStock === undefined) delete demoStockMap[productId];
    else demoStockMap[productId] = originalStock;
    assert.equal(getStockForProduct(productId), stockBefore);
  }
});

test('T5: mock giới hạn gửi đơn liên tiếp theo số điện thoại', () => {
  const keyOne = `guest-rate-one-${Date.now()}`;
  const keyTwo = `guest-rate-two-${Date.now()}`;
  const guestPayload = payload('0907777668');
  const originalStock = demoStockMap[productId];
  let createdOrderId: string | undefined;

  try {
    demoStockMap[productId] = 5;
    const first = processGuestOrderCreation(keyOne, guestPayload, 3_000_000);
    assert.equal(first.statusCode, 201);
    createdOrderId = first.data?.data.id;

    const limited = processGuestOrderCreation(keyTwo, guestPayload, 3_000_000 + GUEST_ORDER_PHONE_COOLDOWN_MS - 1);
    assert.equal(limited.statusCode, 429);
    assert.match(limited.error?.error.message || '', /Vui lòng chờ/);
  } finally {
    delete guestOrderIdempotencyMap[keyOne];
    delete guestOrderIdempotencyMap[keyTwo];
    delete guestOrderRateLimitMap[guestPayload.phone];
    if (createdOrderId) {
      const index = demoOrders.findIndex(order => order.id === createdOrderId);
      if (index >= 0) demoOrders.splice(index, 1);
    }
    if (originalStock === undefined) delete demoStockMap[productId];
    else demoStockMap[productId] = originalStock;
  }
});

test('T5: endpoint mock guest chỉ nhận request có marker của cờ bật và không cần cookie', async () => {
  const key = `guest-route-${Date.now()}`;
  const phone = '0907777669';
  const originalStock = demoStockMap[productId];
  const stockBefore = getStockForProduct(productId);
  let createdOrderId: string | undefined;
  const sendRequest = async (enabled: boolean) => {
    const req = new PassThrough() as PassThrough & { method: string; headers: Record<string, string> };
    req.method = 'POST';
    req.headers = { 'idempotency-key': `${key}-${enabled}` };
    let response: { status: number; body: any } | null = null;
    const handled = handleC2Mock(
      req,
      { setHeader() {}, end() {} },
      new URL(`http://localhost/api/v1/guest/orders${enabled ? '?_guest_checkout=true' : ''}`),
      (status, body) => { response = { status, body }; }
    );
    req.end(JSON.stringify(payload(enabled ? phone : '0907777670')));
    assert.equal(await handled, true);
    return response;
  };

  try {
    demoStockMap[productId] = 5;
    const disabled = await sendRequest(false);
    assert.equal(disabled?.status, 404);
    assert.equal(disabled?.body.error.code, 'NOT_FOUND');

    const enabled = await sendRequest(true);
    assert.equal(enabled?.status, 201);
    createdOrderId = enabled?.body.data.id;
    assert.ok(createdOrderId);
  } finally {
    delete guestOrderIdempotencyMap[`${key}-false`];
    delete guestOrderIdempotencyMap[`${key}-true`];
    delete guestOrderRateLimitMap[phone];
    if (createdOrderId) {
      const index = demoOrders.findIndex(order => order.id === createdOrderId);
      if (index >= 0) demoOrders.splice(index, 1);
    }
    if (originalStock === undefined) delete demoStockMap[productId];
    else demoStockMap[productId] = originalStock;
    assert.equal(getStockForProduct(productId), stockBefore);
  }
});
