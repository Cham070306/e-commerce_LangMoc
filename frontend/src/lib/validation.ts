/**
 * Quy tắc xác thực số điện thoại theo hợp đồng CSDL và thỏa thuận nhóm C2:
 * - trim, bắt buộc
 * - Cột varchar(20) trong DB: tối đa 20 ký tự
 * - Chỉ cho phép chữ số, khoảng trắng, và các ký tự phân cách thông dụng: +, -, ., (, )
 * - Ký tự '+' chỉ được phép ở đầu chuỗi (nếu có)
 * - Sau khi bỏ toàn bộ ký tự phân cách/khoảng trắng, chuỗi số còn lại phải có độ dài từ 8 đến 15 chữ số
 */
export function validatePhone(phone: string | null | undefined): { valid: boolean; error?: string; cleanPhone?: string } {
  if (phone === null || phone === undefined) {
    return { valid: false, error: 'Vui lòng nhập số điện thoại' };
  }

  const trimmed = phone.trim();
  if (!trimmed) {
    return { valid: false, error: 'Vui lòng nhập số điện thoại' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Số điện thoại không được vượt quá 20 ký tự' };
  }

  // Kiểm tra chỉ chứa các ký tự hợp lệ
  const allowedPattern = /^[0-9+\s\-().]+$/;
  if (!allowedPattern.test(trimmed)) {
    return { valid: false, error: 'Số điện thoại chỉ được chứa chữ số và các ký tự (+, -, ., ())' };
  }

  // Dấu '+' chỉ được xuất hiện ở vị trí đầu tiên
  const plusIndex = trimmed.indexOf('+');
  if (plusIndex > 0 || (trimmed.match(/\+/g) || []).length > 1) {
    return { valid: false, error: 'Dấu + chỉ được đặt ở đầu số điện thoại' };
  }

  // Lấy toàn bộ chữ số
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, error: 'Số điện thoại phải có từ 8 đến 15 chữ số' };
  }

  return { valid: true, cleanPhone: trimmed };
}
