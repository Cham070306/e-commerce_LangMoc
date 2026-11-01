import React from 'react';
import { AlertCircle, CheckCircle, Clock, Package, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { ORDER_STATUS_TABLE, isOrderStatus } from './orderStatus';

export function getStatusBadge(status: string) {
  const row = isOrderStatus(status) ? ORDER_STATUS_TABLE[status] : ORDER_STATUS_TABLE.pending;
  const Icon = status === 'pending'
    ? Clock
    : status === 'confirmed' || status === 'delivered'
      ? CheckCircle
      : status === 'packing'
        ? Package
        : status === 'shipping'
          ? Truck
          : status === 'cancelled'
            ? XCircle
            : AlertCircle;

  return (
    <span className={`c2-order-status-badge c2-status-${row.colorToken}`}>
      <Icon size={12} /> {isOrderStatus(status) ? row.label : status}
    </span>
  );
}

export function getPaymentStatusLabel(status?: string, method?: string): string {
  if (!status) return 'Chưa rõ';
  if (status === 'unpaid') {
    return method === 'cod'
      ? 'Chưa thanh toán (thanh toán khi nhận hàng)'
      : 'Chưa thanh toán';
  }
  if (status === 'paid') return 'Đã thanh toán';
  if (status === 'pending') return 'Đang xử lý thanh toán';
  if (status === 'failed') return 'Thanh toán thất bại';
  if (status === 'refunded') return 'Đã hoàn tiền';
  return status;
}

export function getPaymentBadge(status?: string, method?: string) {
  const label = getPaymentStatusLabel(status, method);
  const isPaid = status === 'paid';
  const isUnpaid = status === 'unpaid';
  const palette = isPaid
    ? { background: '#ecfdf5', color: '#065f46', border: '#a7f3d0' }
    : isUnpaid
      ? { background: '#fffbeb', color: '#92400e', border: '#fde68a' }
      : status === 'failed'
        ? { background: '#fef2f2', color: '#991b1b', border: '#fecaca' }
        : { background: '#f3f4f6', color: '#374151', border: '#e5e7eb' };

  return (
    <span
      className="c2-payment-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 500,
        background: palette.background,
        color: palette.color,
        border: `1px solid ${palette.border}`
      }}
    >
      {isPaid ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
      {label}
    </span>
  );
}
