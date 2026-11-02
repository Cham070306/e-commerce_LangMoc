import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// backend/src/db -> repo root/database
const databaseDir = path.resolve(here, '..', '..', '..', 'database');

/**
 * Chạy toàn bộ file migration .sql trong database/ theo thứ tự tên.
 * Các file đều idempotent; migration 001 dùng CREATE TABLE nên chỉ chạy trên DB trống.
 * Script bỏ qua 001 nếu bảng users đã tồn tại để tránh lỗi khi chạy lặp.
 */
async function main(): Promise<void> {
  const files = (await readdir(databaseDir)).filter((name) => /^\d{3}_.*\.sql$/.test(name)).sort();

  for (const file of files) {
    const fullPath = path.join(databaseDir, file);
    if (file.startsWith('001_')) {
      const exists = await pool.query<{ exists: boolean }>(
        `SELECT to_regclass('public.users') IS NOT NULL AS exists`,
      );
      if (exists.rows[0]?.exists) {
        console.log(`[migrate] Bỏ qua ${file} (bảng users đã tồn tại).`);
        continue;
      }
    }
    const sql = await readFile(fullPath, 'utf8');
    console.log(`[migrate] Đang chạy ${file}...`);
    await pool.query(sql);
    console.log(`[migrate] Xong ${file}.`);
  }

  console.log('[migrate] Hoàn tất.');
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('[migrate] Lỗi:', error);
    await pool.end();
    process.exit(1);
  });
