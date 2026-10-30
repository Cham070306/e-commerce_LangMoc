import type { Address } from './types';

/**
 * ĐỀ XUẤT CHỜ KHẢI: docs/API.md hiện chỉ công bố GET/POST /me/addresses.
 * Không dùng endpoint này trên live nếu VITE_FEATURE_ADDRESS_DELETE không bật.
 */
export const ADDRESS_DELETE_CONTRACT = {
  method: 'DELETE',
  path: (id: string) => `/me/addresses/${encodeURIComponent(id)}`,
  successStatus: 204,
  notFoundStatus: 404,
  conflictStatus: 409
} as const;

export function getAddressSelectionAfterDelete(
  addresses: Address[],
  deletedAddressId: string,
  selectedAddressId: string
): string {
  if (selectedAddressId && selectedAddressId !== deletedAddressId && addresses.some(address => address.id === selectedAddressId)) {
    return selectedAddressId;
  }

  return addresses[0]?.id || '';
}
