/** Lỗi nghiệp vụ có HTTP status và mã lỗi theo envelope docs/API.md. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static validation(message = 'Dữ liệu không hợp lệ', fields?: Record<string, string>): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, fields);
  }
  static unauthenticated(message = 'Vui lòng đăng nhập'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'Không có quyền'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Không tìm thấy dữ liệu'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
}
