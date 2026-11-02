import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.resolve(here, '..', '..', '..', 'database', 'seeds');

async function main(): Promise<void> {
  const files = (await readdir(seedsDir)).filter((name) => name.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('[seed] Không có file seed nào.');
    return;
  }
  for (const file of files) {
    const sql = await readFile(path.join(seedsDir, file), 'utf8');
    console.log(`[seed] Đang chạy ${file}...`);
    await pool.query(sql);
    console.log(`[seed] Xong ${file}.`);
  }

  const counts = await pool.query<{ categories: string; products: string; users: string }>(
    `SELECT
       (SELECT count(*) FROM categories)::text AS categories,
       (SELECT count(*) FROM products)::text AS products,
       (SELECT count(*) FROM users)::text AS users`,
  );
  const row = counts.rows[0];
  console.log(
    `[seed] Hoàn tất: ${row?.categories ?? 0} danh mục, ${row?.products ?? 0} sản phẩm, ${row?.users ?? 0} người dùng.`,
  );
  console.log('[seed] Demo admin@langmoc.local / Admin@123 · customer@langmoc.local / Customer@123 (chỉ local).');
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('[seed] Lỗi:', error);
    await pool.end();
    process.exit(1);
  });
