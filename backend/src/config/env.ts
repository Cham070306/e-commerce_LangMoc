import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}. Xem backend/.env.example.`);
  }
  return value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Biến môi trường ${name} phải là số nguyên dương.`);
  }
  return parsed;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: intEnv('API_PORT', 4000),
  databaseUrl: required('DATABASE_URL'),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret-change-me',
  sessionTtlSeconds: intEnv('SESSION_TTL_SECONDS', 7 * 24 * 60 * 60),
  cookieSecure: (process.env.COOKIE_SECURE ?? 'false').toLowerCase() === 'true',
  sessionCookieName: 'langmoc_sid',
} as const;

export function assertProductionConfig(): void {
  if (config.env === 'production') {
    if (config.sessionSecret === 'dev-only-secret-change-me') {
      throw new Error('SESSION_SECRET phải được đổi khi chạy production.');
    }
    if (!config.cookieSecure) {
      throw new Error('COOKIE_SECURE phải là true khi chạy production (HTTPS).');
    }
  }
}
