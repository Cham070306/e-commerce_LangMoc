export const VIETNAM_PHONE_PATTERN = /^0[235789][0-9]{8}$/;

export const PHONE_REQUIRED_MESSAGE = 'Vui lòng nhập số điện thoại';
export const PHONE_INVALID_MESSAGE = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0 (ví dụ 0901234567)';

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function validateVietnamPhone(phone: string | null | undefined): PhoneValidationResult {
  if (phone === null || phone === undefined || phone.trim() === '') {
    return { valid: false, error: PHONE_REQUIRED_MESSAGE };
  }

  if (!VIETNAM_PHONE_PATTERN.test(phone)) {
    return { valid: false, error: PHONE_INVALID_MESSAGE };
  }

  return { valid: true };
}
