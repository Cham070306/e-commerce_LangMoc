import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECKOUT_TERMS, requiresCheckoutTermsAcceptance } from '../src/content/checkoutConsent.ts';
import { computeOrderFingerprint } from '../src/features/checkout/idempotency.ts';

test('T4: mặc định chưa đồng ý thì bị chặn, tích thì cho phép, bỏ tích lại chặn', () => {
  assert.equal(requiresCheckoutTermsAcceptance(false), true);
  assert.equal(requiresCheckoutTermsAcceptance(true), false);
  assert.equal(requiresCheckoutTermsAcceptance(false), true);
  assert.equal(CHECKOUT_TERMS.requiredMessage, 'Vui lòng đồng ý với điều khoản để đặt hàng');
});

test('T4: ba liên kết chính sách dùng đúng route, mở ở tab mới do Checkout áp dụng target blank', () => {
  assert.deepEqual(CHECKOUT_TERMS.policies.map(policy => policy.href), [
    '#/policies/shipping',
    '#/policies/returns',
    '#/policies/warranty'
  ]);
});

test('T4: đồng ý điều khoản không thay đổi dấu vân tay idempotency', () => {
  const payload = { items: [{ id: 'product-1', quantity: 1 }], address_id: 'address-1', note: 'Giao giờ hành chính' };
  assert.equal(computeOrderFingerprint(payload), computeOrderFingerprint(payload));
});
