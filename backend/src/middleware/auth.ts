import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { AppError } from '../common/errors.js';
import { findUserBySessionToken, type SessionUser } from '../modules/auth/session.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Gắn req.user nếu có session hợp lệ, không chặn request công khai. */
export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[config.sessionCookieName] as string | undefined;
    if (token) {
      const user = await findUserBySessionToken(token);
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Yêu cầu đã đăng nhập (dùng cho /me, /auth/me, đặt đơn...). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(AppError.unauthenticated());
    return;
  }
  next();
}

/** Yêu cầu role admin, kiểm tra tại API chứ không tin client. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(AppError.unauthenticated());
    return;
  }
  if (req.user.role !== 'admin') {
    next(AppError.forbidden('Chỉ quản trị viên được truy cập.'));
    return;
  }
  next();
}
