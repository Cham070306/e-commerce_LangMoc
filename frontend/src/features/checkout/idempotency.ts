/**
 * Quản lý Idempotency-Key gắn liền với dấu vân tay (fingerprint) của nội dung đơn hàng.
 * Tuân thủ yêu cầu Mốc M3:
 * - Dấu vân tay bao gồm: danh sách món + số lượng, address_id, promotion_code, note.
 * - Lưu { fingerprint, key } trong sessionStorage (có try/catch).
 * - Cùng dấu vân tay thì GIỮ nguyên key khi retry / tải lại trang.
 * - Đổi dấu vân tay hoặc đặt thành công thì sinh key mới.
 */

export interface CheckoutFingerprintInput {
  items: Array<{ id: string; quantity: number }>;
  address_id: string;
  promotion_code?: string | null;
  note?: string | null;
}

export const IDEMPOTENCY_STORAGE_KEY = 'langmoc.checkout.idempotency.v1';

export function computeOrderFingerprint(input: CheckoutFingerprintInput): string {
  const normalizedItems = (input.items || [])
    .map(i => ({ id: String(i.id), quantity: Number(i.quantity) }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return JSON.stringify({
    items: normalizedItems,
    address_id: (input.address_id || '').trim(),
    promotion_code: (input.promotion_code || '').trim().toUpperCase(),
    note: (input.note || '').trim()
  });
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface StoredIdempotencyData {
  fingerprint: string;
  key: string;
}

export function getIdempotencyKey(
  input: CheckoutFingerprintInput,
  storage?: Storage
): { key: string; isNew: boolean } {
  const currentFingerprint = computeOrderFingerprint(input);

  let targetStorage: Storage | null = null;
  try {
    targetStorage = storage || (typeof window !== 'undefined' ? window.sessionStorage : null);
  } catch {
    targetStorage = null;
  }

  if (targetStorage) {
    try {
      const raw = targetStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      if (raw) {
        const parsed: StoredIdempotencyData = JSON.parse(raw);
        if (parsed && parsed.fingerprint === currentFingerprint && typeof parsed.key === 'string' && parsed.key) {
          return { key: parsed.key, isNew: false };
        }
      }
    } catch {
      // Bỏ qua lỗi đọc sessionStorage
    }
  }

  const newKey = generateUUID();

  if (targetStorage) {
    try {
      const data: StoredIdempotencyData = {
        fingerprint: currentFingerprint,
        key: newKey
      };
      targetStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Bỏ qua lỗi ghi sessionStorage
    }
  }

  return { key: newKey, isNew: true };
}

export function clearIdempotencyKey(storage?: Storage): void {
  try {
    const targetStorage = storage || (typeof window !== 'undefined' ? window.sessionStorage : null);
    targetStorage?.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Bỏ qua lỗi xóa sessionStorage
  }
}
