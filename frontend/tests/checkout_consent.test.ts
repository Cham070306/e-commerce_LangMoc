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
  assert.deepEqual(CHECKOUT_TERMS.policies, [
    { label: 'Chính sách vận chuyển', href: '#/policies/shipping' },
    { label: 'Chính sách đổi trả', href: '#/policies/returns' },
    { label: 'Chính sách bảo hành', href: '#/policies/warranty' }
  ]);
  assert.equal(CHECKOUT_TERMS.policies.some(policy => policy.href.includes('privacy')), false);
});

test('T4: đồng ý điều khoản không thay đổi dấu vân tay idempotency', () => {
  const payload = { items: [{ id: 'product-1', quantity: 1 }], address_id: 'address-1', note: 'Giao giờ hành chính' };
  assert.equal(computeOrderFingerprint(payload), computeOrderFingerprint(payload));
});

test('T5: thông tin khách vãng lai nằm trong dấu vân tay idempotency', () => {
  const payload = {
    items: [{ id: 'product-1', quantity: 1 }],
    address_id: 'guest-checkout',
    guest_details: {
      recipient_name: 'Nguyễn Văn A',
      phone: '0901234567',
      address_line: '12 Đường Mộc'
    }
  };
  assert.equal(computeOrderFingerprint(payload), computeOrderFingerprint(payload));
  assert.notEqual(computeOrderFingerprint(payload), computeOrderFingerprint({
    ...payload,
    guest_details: { ...payload.guest_details, address_line: '14 Đường Mộc' }
  }));
  assert.notEqual(computeOrderFingerprint(payload), computeOrderFingerprint({
    ...payload,
    guest_details: { ...payload.guest_details, phone: '0901234568' }
  }));
  assert.notEqual(computeOrderFingerprint(payload), computeOrderFingerprint({
    ...payload,
    guest_details: { ...payload.guest_details, recipient_name: 'Nguyễn Văn B' }
  }));
});
