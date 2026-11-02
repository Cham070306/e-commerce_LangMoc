import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Mỗi file test chạy trong process riêng: cấp cổng khác nhau để không tranh nhau.
const TEST_PORT = process.env.TEST_API_PORT ?? String(4100 + (process.pid % 500));
const TSX_CLI = path.join(backendRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
export const BASE = `http://127.0.0.1:${TEST_PORT}/api/v1`;

let server: ChildProcess | undefined;

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* chưa lên, thử lại */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Không khởi động được server test.');
}

export async function startServer(): Promise<void> {
  if (server) return;
  // Dùng node trực tiếp với cli của tsx: tránh shell:true (cảnh báo DEP0190) và .cmd trên Windows.
  server = spawn(process.execPath, [TSX_CLI, 'src/server.ts'], {
    cwd: backendRoot,
    env: { ...process.env, API_PORT: TEST_PORT, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  await waitForServer(`${BASE}/health`);
}

export async function stopServer(): Promise<void> {
  if (!server) return;
  const pid = server.pid;
  server = undefined;
  if (!pid) return;

  // Trên Windows, tsx sinh tiến trình con giữ cổng; phải kill cả cây process.
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }
  server.kill('SIGTERM');
}

/**
 * Dọn dữ liệu do test sinh ra để DB luôn trở về đúng trạng thái seed.
 * Chỉ xóa bản ghi có tên/email do test tạo, không đụng dữ liệu demo.
 */
export async function cleanupTestData(): Promise<void> {
  const { pool } = await import('../src/db/pool.js');
  try {
    await pool.query(
      `DELETE FROM product_images WHERE product_id IN (
         SELECT id FROM products WHERE name LIKE 'Sản Phẩm Test%' OR name = 'Sản Phẩm Minh Chứng'
       )`,
    );
    await pool.query(`DELETE FROM products WHERE name LIKE 'Sản Phẩm Test%' OR name = 'Sản Phẩm Minh Chứng'`);
    await pool.query(`DELETE FROM categories WHERE name LIKE 'Danh Mục Test%' OR name = 'Minh Chứng Tạm'`);
    await pool.query(
      `DELETE FROM users WHERE email LIKE 'test%@example.com'
          OR email LIKE 'dup%@example.com'
          OR email LIKE 'user%@example.com'`,
    );
    await pool.query(`DELETE FROM addresses WHERE recipient_name = 'Người Nhận Test'`);
  } finally {
    await pool.end();
  }
}

/** Gửi request và trả về status + body JSON + cookie. */
export async function api(
  pathName: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<{ status: number; body: any; cookie: string }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.cookie) headers['Cookie'] = options.cookie;

  const res = await fetch(`${BASE}${pathName}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  return { status: res.status, body, cookie };
}
