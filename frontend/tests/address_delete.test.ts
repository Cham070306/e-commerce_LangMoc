import test from 'node:test';
import assert from 'node:assert/strict';
import { getAddressSelectionAfterDelete } from '../src/lib/addressContracts.ts';
import { deleteAddressForUser, demoAddresses, demoOrders, type DemoAddress } from '../mock/c2Mock.ts';

function addAddress(id: string, userId = 'user-customer-linh'): DemoAddress {
  const address: DemoAddress = {
    id,
    user_id: userId,
    full_name: 'Người nhận thử nghiệm',
    phone: '0901234567',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street_address: '12 Đường Thử Nghiệm',
    is_default: false,
    created_at: new Date().toISOString()
  };
  demoAddresses.push(address);
  return address;
}

test('T3: xóa địa chỉ thường tải lại danh sách; đơn cũ giữ nguyên snapshot', () => {
  const address = addAddress(`addr-delete-${Date.now()}`);
  const oldOrderAddress = demoOrders[0].shipping_address;
  const result = deleteAddressForUser('user-customer-linh', address.id);

  assert.equal(result.statusCode, 204);
  assert.equal(demoAddresses.some(item => item.id === address.id), false);
  assert.equal(demoOrders[0].shipping_address, oldOrderAddress);
});

test('T3: xóa địa chỉ đang chọn chuyển về địa chỉ mặc định/đầu tiên, xóa cuối cùng bỏ chọn', () => {
  const remainingAddresses = [{ id: 'address-other', is_default: false }] as any;
  assert.equal(getAddressSelectionAfterDelete(remainingAddresses, 'address-default', 'address-default'), 'address-other');
  assert.equal(getAddressSelectionAfterDelete([], 'address-last', 'address-last'), '');
});

test('T3: không thể xóa địa chỉ của người khác', () => {
  const foreign = addAddress(`addr-foreign-${Date.now()}`, 'user-customer-minh');
  const result = deleteAddressForUser('user-customer-linh', foreign.id);

  assert.equal(result.statusCode, 404);
  assert.equal(result.error?.error.code, 'NOT_FOUND');
  const index = demoAddresses.findIndex(address => address.id === foreign.id);
  if (index >= 0) demoAddresses.splice(index, 1);
});
