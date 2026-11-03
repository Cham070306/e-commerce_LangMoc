import type { Address, AddressPayload } from './types.ts';

export interface LiveAddress extends Omit<Address, 'full_name' | 'street_address'> {
  recipient_name: string;
  address_line: string;
}

export function fromLiveAddress(address: LiveAddress): Address {
  const { recipient_name, address_line, ...rest } = address;
  return { ...rest, full_name: recipient_name, street_address: address_line };
}

export function toLiveAddress(address: AddressPayload) {
  const { full_name, street_address, ...rest } = address;
  return { ...rest, recipient_name: full_name, address_line: street_address };
}

export function addressFieldErrors(fields?: Record<string, string>) {
  if (!fields) return undefined;
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key === 'recipient_name' ? 'full_name' : key === 'address_line' ? 'street_address' : key, value
  ]));
}
