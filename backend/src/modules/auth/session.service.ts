import crypto from 'node:crypto';
import type { Response } from 'express';
import { config } from '../../config/env.js';
import { query, queryOne } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';

export interface SessionUser {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin';
  phone: string | null;
}

interface SessionRow {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin';
  phone: string | null;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Tạo session mới, trả token thô để đặt vào cookie (DB chỉ lưu hash). */
export async function createSession(
  userId: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);

  await query(
    `INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      hashToken(token),
      meta.userAgent?.slice(0, 255) ?? null,
      meta.ip?.slice(0, 45) ?? null,
      expiresAt,
    ],
  );

  return { token, expiresAt };
}

/** Tìm người dùng theo session token còn hiệu lực. */
export async function findUserBySessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await queryOne<SessionRow>(
    `SELECT u.id, u.full_name, u.email, u.role, u.phone
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.is_active = true`,
    [hashToken(token)],
  );
  return row ?? null;
}

/** Thu hồi một session (logout). */
export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  await query(`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [
    hashToken(token),
  ]);
}

/** Dọn session hết hạn (gọi định kỳ hoặc khi logout). */
export async function purgeExpiredSessions(): Promise<void> {
  await query(`DELETE FROM sessions WHERE expires_at <= now()`);
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

export function requireSessionToken(token: string | undefined): string {
  if (!token) throw AppError.unauthenticated();
  return token;
}
