/**
 * Sinh minh chứng cho phần backend C3: gọi API thật và ghi kết quả dạng text.
 * Chạy: npx tsx scripts/evidence.ts (cần server chạy ở API_PORT, mặc định 4000)
 * Kết quả ghi vào docs/evidence/backend/http-checks.txt
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'docs', 'evidence', 'backend');
const BASE = process.env.EVIDENCE_BASE ?? 'http://127.0.0.1:4000/api/v1';

const lines: string[] = [];
function log(text = '') {
  lines.push(text);
  console.log(text);
}

let cookie = '';
async function call(method: string, pathname: string, body?: unknown, useCookie = true) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (useCookie && cookie) headers['Cookie'] = cookie;
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (setCookies.length) cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

function section(title: string) {
  log('');
  log('='.repeat(78));
  log(title);
  log('='.repeat(78));
}

async function step(label: string, method: string, pathname: string, body?: unknown, useCookie = true) {
  const res = await call(method, pathname, body, useCookie);
  log(`${method} ${pathname}`);
  if (body !== undefined) log(`  body: ${JSON.stringify(body)}`);
  log(`  -> ${res.status}`);
  log(`  ${JSON.stringify(res.body)}`);
  log('');
  return res;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  log(`Minh chứng API Làng Mộc — sinh tự động ngày ${new Date().toISOString()}`);
  log(`Base URL: ${BASE}`);
  log(`Môi trường: PostgreSQL 16 local, dữ liệu seed database/seeds/001_demo.sql`);

  section('1. Health check và kết nối DB');
  await step('health', 'GET', '/health');

  section('2. Catalog công khai');
  await step('danh mục', 'GET', '/categories');
  await step('sản phẩm mặc định (12/trang)', 'GET', '/products');
  await step('tìm không dấu: q=gom', 'GET', '/products?q=gom&sort=price_asc');
  await step('lọc danh mục mây tre', 'GET', '/products?category=may-tre-dan');
  await step('lọc khoảng giá 100k-200k', 'GET', '/products?min_price=100000&max_price=200000');
  await step('sắp xếp giá giảm dần', 'GET', '/products?sort=price_desc&limit=5');
  await step('chi tiết theo slug', 'GET', '/products/bat-chiet-yeu-3dfddfe5');
  await step('review của sản phẩm', 'GET', '/products/bat-chiet-yeu-3dfddfe5/reviews');
  await step('tìm không có kết quả', 'GET', '/products?q=zzzz-khong-ton-tai');

  section('3. Kiểm tra lỗi đầu vào (400/404)');
  await step('sort không hợp lệ', 'GET', '/products?sort=DROP_TABLE');
  await step('khoảng giá ngược', 'GET', '/products?min_price=500000&max_price=1000');
  await step('limit vượt 100', 'GET', '/products?limit=500');
  await step('slug không tồn tại', 'GET', '/products/khong-ton-tai');

  section('4. Xác thực');
  cookie = '';
  await step('/auth/me khi chưa đăng nhập', 'GET', '/auth/me', undefined, false);
  await step('đăng nhập sai mật khẩu', 'POST', '/auth/login', { email: 'customer@langmoc.local', password: 'sai' }, false);
  await step('đăng nhập customer', 'POST', '/auth/login', { email: 'customer@langmoc.local', password: 'Customer@123' }, false);
  await step('/auth/me với cookie phiên', 'GET', '/auth/me');

  section('5. Phân quyền');
  await step('customer gọi admin -> 403', 'GET', '/admin/products');

  section('6. Địa chỉ của customer');
  await step('danh sách địa chỉ', 'GET', '/me/addresses');
  const created = await step('tạo địa chỉ mới', 'POST', '/me/addresses', {
    recipient_name: 'Minh Chứng Test',
    phone: '0912345678',
    province: 'Hà Nội',
    district: 'Hoàn Kiếm',
    ward: 'Hàng Bài',
    address_line: 'Số 10 Tràng Tiền',
  });
  const addrId = (created.body as { data?: { id?: string } })?.data?.id;
  if (addrId) await step('xóa địa chỉ test', 'DELETE', `/me/addresses/${addrId}`);

  section('7. Admin catalog');
  cookie = '';
  await step('đăng nhập admin', 'POST', '/auth/login', { email: 'admin@langmoc.local', password: 'Admin@123' }, false);
  await step('danh sách sản phẩm admin', 'GET', '/admin/products');
  const cat = await step('tạo danh mục tạm', 'POST', '/admin/categories', { name: 'Minh Chứng Tạm' });
  const catId = (cat.body as { data?: { id?: string } })?.data?.id;
  if (catId) {
    const prod = await step('tạo sản phẩm tạm', 'POST', '/admin/products', {
      name: 'Sản Phẩm Minh Chứng',
      category_id: catId,
      price_vnd: 150000,
      stock_quantity: 7,
      status: 'active',
      images: [{ url: '/images/products/57c220ed93cb8a007a77.jpg', alt: 'minh chứng', sort_order: 0 }],
    });
    const prodId = (prod.body as { data?: { id?: string } })?.data?.id;
    if (prodId) {
      await step('sửa giá và tồn kho', 'PATCH', `/admin/products/${prodId}`, {
        price_vnd: 120000,
        stock_quantity: 4,
      });
      await step('từ chối giá giảm >= giá gốc', 'PATCH', `/admin/products/${prodId}`, {
        sale_price_vnd: 200000,
      });
      await step('đặt giá giảm hợp lệ', 'PATCH', `/admin/products/${prodId}`, {
        sale_price_vnd: 99000,
      });
      await step('ẩn sản phẩm tạm (dọn dữ liệu)', 'PATCH', `/admin/products/${prodId}`, {
        status: 'hidden',
      });
    }
    await step('ẩn danh mục tạm (dọn dữ liệu)', 'PATCH', `/admin/categories/${catId}`, { is_active: false });
  }

  section('8. Đăng xuất');
  await step('logout', 'POST', '/auth/logout');
  await step('/auth/me sau logout -> 401', 'GET', '/auth/me');

  // Dọn dẹp: script chỉ ẩn được qua API công khai, nên xóa hẳn bản ghi tạm bằng SQL.
  await cleanupTempRecords();

  await writeFile(path.join(outDir, 'http-checks.txt'), lines.join('\n') + '\n', 'utf8');
  console.log(`\nĐã ghi ${path.join(outDir, 'http-checks.txt')}`);
}

async function cleanupTempRecords() {
  const { pool } = await import('../backend/src/db/pool.ts');
  await pool.query(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE name = 'Sản Phẩm Minh Chứng')`);
  await pool.query(`DELETE FROM products WHERE name = 'Sản Phẩm Minh Chứng'`);
  await pool.query(`DELETE FROM categories WHERE name = 'Minh Chứng Tạm'`);
  await pool.end();
  console.log('\nĐã xóa bản ghi tạm dùng cho minh chứng.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});