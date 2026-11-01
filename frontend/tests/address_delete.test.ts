import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { getAddressSelectionAfterDelete } from '../src/lib/addressContracts.ts';
import { deleteAddressForUser, demoAddresses, demoOrders, handleC2Mock, type DemoAddress } from '../mock/c2Mock.ts';
import type { Address } from '../src/lib/types.ts';

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
  const remainingAddresses: Address[] = [{
    id: 'address-other',
    full_name: 'Người nhận thử nghiệm',
    phone: '0901234567',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street_address: '12 Đường Thử Nghiệm',
    is_default: false
  }];
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

test('T3: endpoint mock DELETE xác thực quyền sở hữu và trả 204 hoặc 404', async () => {
  const owned = addAddress(`addr-delete-route-${Date.now()}`);
  const foreign = addAddress(`addr-delete-route-foreign-${Date.now()}`, 'user-customer-minh');

  const sendDelete = async (addressId: string, userId: string) => {
    const req = new PassThrough() as PassThrough & { method: string; headers: Record<string, string> };
    req.method = 'DELETE';
    req.headers = { cookie: `vc_session=${userId}` };

    const responseHeaders: Record<string, string> = {};
    let response: { status: number; body: any } | null = null;
    let ended = false;
    const handled = handleC2Mock(
      req,
      {
        statusCode: 200,
        setHeader(name: string, value: string) { responseHeaders[name] = value; },
        end() { ended = true; }
      },
      new URL(`http://localhost/api/v1/me/addresses/${encodeURIComponent(addressId)}`),
      (status, body) => { response = { status, body }; }
    );
    req.end();

    assert.equal(await handled, true);
    return { response, responseHeaders, ended };
  };

  try {
    const deleted = await sendDelete(owned.id, 'user-customer-linh');
    assert.equal(deleted.response, null);
    assert.equal(deleted.responseHeaders['X-Lang-Moc-Data'], 'mock');
    assert.equal(deleted.ended, true);
    assert.equal(demoAddresses.some(address => address.id === owned.id), false);

    const denied = await sendDelete(foreign.id, 'user-customer-linh');
    assert.equal(denied.response?.status, 404);
    assert.equal(denied.response?.body.error.code, 'NOT_FOUND');
    assert.equal(demoAddresses.some(address => address.id === foreign.id), true);
  } finally {
    for (const id of [owned.id, foreign.id]) {
      const index = demoAddresses.findIndex(address => address.id === id);
      if (index >= 0) demoAddresses.splice(index, 1);
    }
  }
});
