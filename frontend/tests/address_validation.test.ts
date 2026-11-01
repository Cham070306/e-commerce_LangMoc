import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { handleC2Mock } from '../mock/c2Mock.ts';
import {
  PHONE_INVALID_MESSAGE,
  PHONE_REQUIRED_MESSAGE,
  sanitizePhoneInput,
  validateVietnamPhone
} from '../src/lib/addressValidation.ts';

test('T1: chỉ chấp nhận số điện thoại Việt Nam gồm đúng 10 chữ số liền nhau', () => {
  for (const value of ['abc', ' ', '090123456', '09012345678', '090-123-4567', '+84901234567', '0123456789']) {
    assert.equal(validateVietnamPhone(value).valid, false, `${value} phải bị từ chối`);
  }

  assert.equal(validateVietnamPhone('').error, PHONE_REQUIRED_MESSAGE);
  assert.equal(validateVietnamPhone('090123456').error, PHONE_INVALID_MESSAGE);
  assert.equal(validateVietnamPhone('0901234567').valid, true);
  assert.equal(validateVietnamPhone('0283123456').valid, true);
});

test('T1: input điện thoại chỉ giữ chữ số và tối đa 10 ký tự', () => {
  assert.equal(sanitizePhoneInput('090-123-4567'), '0901234567');
  assert.equal(sanitizePhoneInput('+84 901234567'), '8490123456');
  assert.equal(sanitizePhoneInput('abc'), '');
});

test('T1: mock địa chỉ từ chối số điện thoại sai và trả lỗi ở fields.phone', async () => {
  const req = new PassThrough() as PassThrough & { method: string; headers: Record<string, string> };
  req.method = 'POST';
  req.headers = { cookie: 'vc_session=user-customer-linh' };

  let response: { status: number; body: any } = { status: 0, body: null };
  const handled = handleC2Mock(
    req,
    { setHeader() {} },
    new URL('http://localhost/api/v1/me/addresses'),
    (status, body) => { response = { status, body }; }
  );
  req.end(JSON.stringify({
    full_name: 'Người nhận thử nghiệm',
    phone: '090-123-4567',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    street_address: '12 Đường Thử Nghiệm'
  }));

  assert.equal(await handled, true);
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.equal(response.body.error.fields.phone, PHONE_INVALID_MESSAGE);
});
