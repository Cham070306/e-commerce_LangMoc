// API mua hàng không cần tài khoản: mock và backend PostgreSQL dùng cùng payload.
export const GUEST_CHECKOUT_CONTRACT = {
  label: 'Đặt hàng COD không cần tài khoản',
  mockFlagParameter: '_guest_checkout=true',
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

export interface MockGuestCheckoutPayload {
  recipient_name: string;
  phone: string;
  address_line: string;
  note?: string;
  items: Array<{ product_id: string; quantity: number }>;
}

export interface MockGuestCheckoutPreviewPayload {
  items: MockGuestCheckoutPayload['items'];
}

export function hasGuestOrderSnapshot(orderId: string): boolean {
  try {
    const raw = sessionStorage.getItem(`langmoc.last_order.${orderId}`);
    return raw !== null && JSON.parse(raw)?.user_id === null;
  } catch {
    return false;
  }
}
