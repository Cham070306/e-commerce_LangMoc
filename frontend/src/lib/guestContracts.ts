/**
 * MÔ PHỎNG / ĐỀ XUẤT CHỜ KHẢI-SƠN.
 * Các endpoint này không tồn tại trong docs/API.md và không được gọi ở live.
 * Chỉ là điểm tập trung để thảo luận hợp đồng backend cho khách vãng lai.
 */
export const GUEST_CHECKOUT_CONTRACT = {
  label: 'MÔ PHỎNG / ĐỀ XUẤT CHỜ KHẢI-SƠN',
  preview: { method: 'POST', path: '/guest/checkout/preview' },
  createOrder: { method: 'POST', path: '/guest/orders', idempotencyHeader: 'Idempotency-Key' },
  lookup: { method: 'POST', path: '/guest/orders/lookup' }
} as const;

export interface ProposedGuestAddress {
  province: string;
  ward: string;
  address_line: string;
}

export interface ProposedGuestCheckoutPayload {
  recipient_name: string;
  phone: string;
  address: ProposedGuestAddress;
  note?: string;
  items: Array<{ product_id: string; quantity: number }>;
}
