import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';

export const BCRYPT_ROUNDS = 12;

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(120, 'Họ tên tối đa 120 ký tự'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ').max(255),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
  phone: z
    .string()
    .trim()
    .max(20, 'Số điện thoại tối đa 20 ký tự')
    .regex(/^[0-9+\s.-]*$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin';
  phone: string | null;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin';
  phone: string | null;
  password_hash: string;
  is_active: boolean;
}

export function parseRegisterInput(body: unknown) {
  return registerSchema.parse(body ?? {});
}

export function parseLoginInput(body: unknown) {
  return loginSchema.parse(body ?? {});
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function registerUser(input: z.infer<typeof registerSchema>): Promise<PublicUser> {
  const existing = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1`, [input.email]);
  if (existing) {
    throw AppError.conflict('Email đã được sử dụng.');
  }

  const passwordHash = await hashPassword(input.password);
  const row = await queryOne<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, 'customer')
     RETURNING id, full_name, email, role, phone, password_hash, is_active`,
    [input.full_name, input.email, passwordHash, input.phone ?? null],
  );
  if (!row) throw new Error('Không tạo được tài khoản.');
  return toPublicUser(row);
}

export async function authenticate(email: string, password: string): Promise<PublicUser> {
  const row = await queryOne<UserRow>(
    `SELECT id, full_name, email, role, phone, password_hash, is_active
       FROM users WHERE lower(email) = $1`,
    [email],
  );

  // Luôn so sánh với một hash để giảm lộ thông tin qua thời gian phản hồi.
  const hash = row?.password_hash ?? '$2a$12$0000000000000000000000000000000000000000000000000000';
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok || !row.is_active) {
    throw AppError.unauthenticated('Email hoặc mật khẩu không đúng.');
  }
  return toPublicUser(row);
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, full_name, email, role, phone, password_hash, is_active
       FROM users WHERE id = $1 AND is_active = true`,
    [id],
  );
  return row ? toPublicUser(row) : null;
}

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, full_name: row.full_name, email: row.email, role: row.role, phone: row.phone };
}

export async function emailExists(email: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
  return Boolean(row);
}

// Dùng trong seed/test: tạo user với role tùy chọn.
export async function createUserWithRole(
  input: { full_name: string; email: string; password: string; phone?: string },
  role: 'customer' | 'admin',
): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  const row = await queryOne<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, full_name, email, role, phone, password_hash, is_active`,
    [input.full_name, input.email.toLowerCase(), passwordHash, input.phone ?? null, role],
  );
  if (!row) throw new Error('Không tạo được tài khoản.');
  return toPublicUser(row);
}

export { query };
