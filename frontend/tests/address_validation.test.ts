import test from 'node:test';
import assert from 'node:assert/strict';
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
