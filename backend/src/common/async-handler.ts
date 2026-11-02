import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';

/** Bọc handler async để lỗi được chuyển tới middleware lỗi. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint.' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields } });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) },
    });
    return;
  }

  // Lỗi PostgreSQL có mã: map một số trường hợp phổ biến, không lộ chi tiết.
  const pgCode = (error as { code?: string }).code;
  if (pgCode === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại.' } });
    return;
  }
  if (pgCode === '23503') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Tham chiếu dữ liệu không hợp lệ.' } });
    return;
  }

  console.error('[api] Lỗi không xử lý:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' } });
}
