export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packing',
  'shipping',
  'delivered',
  'cancelled'
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export const ORDER_STATUS_TABLE: Record<OrderStatus, {
  label: string;
  colorToken: string;
  next: readonly OrderStatus[];
  timelineStep: number;
}> = {
  pending: { label: 'Chờ xác nhận', colorToken: 'pending', next: ['confirmed', 'cancelled'], timelineStep: 1 },
  confirmed: { label: 'Đã xác nhận', colorToken: 'confirmed', next: ['packing'], timelineStep: 2 },
  packing: { label: 'Đang đóng gói', colorToken: 'packing', next: ['shipping'], timelineStep: 3 },
  shipping: { label: 'Đang vận chuyển', colorToken: 'shipping', next: ['delivered'], timelineStep: 4 },
  delivered: { label: 'Giao thành công', colorToken: 'delivered', next: [], timelineStep: 5 },
  cancelled: { label: 'Đã hủy', colorToken: 'cancelled', next: [], timelineStep: 0 }
};

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> =
  Object.fromEntries(ORDER_STATUSES.map(status => [status, ORDER_STATUS_TABLE[status].next])) as Record<OrderStatus, readonly OrderStatus[]>;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> =
  Object.fromEntries(ORDER_STATUSES.map(status => [status, ORDER_STATUS_TABLE[status].label])) as Record<OrderStatus, string>;

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export function canCancelOrder(status: string): boolean {
  return status === 'pending';
}

export function getNextValidStatuses(current: string): OrderStatus[] {
  return isOrderStatus(current) ? [...ORDER_STATUS_TABLE[current].next] : [];
}

export function isValidTransition(from: string, to: string): boolean {
  return isOrderStatus(from) && isOrderStatus(to) && ORDER_STATUS_TABLE[from].next.includes(to);
}

export function getTimelineStepIndex(status: string): number {
  return isOrderStatus(status) ? ORDER_STATUS_TABLE[status].timelineStep : 1;
}
