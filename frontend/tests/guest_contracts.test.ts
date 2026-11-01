import test from 'node:test';
import assert from 'node:assert/strict';
import { isGuestCheckoutEnabled } from '../src/config/site.ts';
import { GUEST_CHECKOUT_CONTRACT } from '../src/lib/guestContracts.ts';

test('T5: hợp đồng khách vãng lai chỉ là đề xuất và cờ mặc định tắt', () => {
  assert.equal(GUEST_CHECKOUT_CONTRACT.label, 'MÔ PHỎNG / ĐỀ XUẤT CHỜ KHẢI-SƠN');
  assert.equal(GUEST_CHECKOUT_CONTRACT.createOrder.idempotencyHeader, 'Idempotency-Key');
  assert.equal(isGuestCheckoutEnabled, false);
});
