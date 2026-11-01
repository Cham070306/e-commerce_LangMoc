import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhone } from '../src/lib/validation.ts';
import { isOrderStatus, ORDER_STATUS_TABLE } from '../src/lib/orderStatus.ts';

test('(F05) validatePhone: Chấp nhận các số điện thoại hợp lệ theo hợp đồng DB varchar(20)', () => {
  // Chuẩn Việt Nam phổ biến
  assert.equal(validatePhone('0901234567').valid, true);
  assert.equal(validatePhone('+84901234567').valid, true);
  assert.equal(validatePhone('090 123 4567').valid, true);
  assert.equal(validatePhone('(024) 3825 1234').valid, true);
  assert.equal(validatePhone('090-123-4567').valid, true);
  assert.equal(validatePhone('090.123.4567').valid, true);
  // Có dấu khoảng trắng 2 đầu được trim
  assert.equal(validatePhone('  0912345678  ').valid, true);
});

test('(F05) validatePhone: Từ chối các số điện thoại sai định dạng', () => {
  // Rỗng / null
  assert.equal(validatePhone('').valid, false);
  assert.equal(validatePhone('   ').valid, false);
  assert.equal(validatePhone(null).valid, false);

  // Chứa chữ cái
  const textCheck = validatePhone('090abc123');
  assert.equal(textCheck.valid, false);
  assert.ok(textCheck.error?.includes('chữ số'));

  // Quá 20 ký tự
  const tooLong = validatePhone('0901234567890123456789');
  assert.equal(tooLong.valid, false);
  assert.ok(tooLong.error?.includes('20 ký tự'));

  // Dấu + ở giữa
  const badPlus = validatePhone('090+1234567');
  assert.equal(badPlus.valid, false);

  // Quá ít chữ số (< 8)
  const tooFew = validatePhone('12345');
  assert.equal(tooFew.valid, false);
  assert.ok(tooFew.error?.includes('8 đến 15'));

  // Quá nhiều chữ số (> 15)
  const tooMany = validatePhone('1234567890123456');
  assert.equal(tooMany.valid, false);
  assert.ok(tooMany.error?.includes('8 đến 15'));
});

test('(F06) orderStatus: Bảng trạng thái chuẩn có packing và đúng thứ tự chuyển bước', () => {
  assert.equal(isOrderStatus('packing'), true);
  assert.equal(ORDER_STATUS_TABLE.packing.label, 'Đang đóng gói');
  assert.deepEqual(ORDER_STATUS_TABLE.confirmed.next, ['packing']);
  assert.deepEqual(ORDER_STATUS_TABLE.packing.next, ['shipping']);
});
