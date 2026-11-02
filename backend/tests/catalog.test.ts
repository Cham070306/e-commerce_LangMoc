import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, cleanupTestData, startServer, stopServer } from './helpers.js';

describe('Catalog công khai', () => {
  before(startServer);
  after(stopServer);

  it('GET /categories trả 4 danh mục đang bật kèm product_count', async () => {
    const res = await api('/categories');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 4);
    for (const cat of res.body.data) {
      assert.equal(typeof cat.product_count, 'number');
      assert.ok(cat.slug);
    }
  });

  it('GET /products phân trang mặc định 12/trang', async () => {
    const res = await api('/products');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 12);
    assert.equal(res.body.meta.total, 12);
    assert.equal(res.body.data.length, 12);
  });

  it('chỉ trả sản phẩm active', async () => {
    const res = await api('/products?limit=100');
    assert.ok(res.body.data.every((p: { status: string }) => p.status === 'active'));
  });

  it('lọc theo danh mục slug', async () => {
    const res = await api('/products?category=gom-su');
    assert.equal(res.status, 200);
    assert.ok(res.body.meta.total >= 3);
    assert.ok(res.body.data.every((p: { category_id: string }) => p.category_id));
  });

  it('tìm kiếm không dấu trả đúng kết quả (gom)', async () => {
    const res = await api('/products?q=gom');
    assert.equal(res.status, 200);
    assert.ok(res.body.meta.total >= 1);
    for (const p of res.body.data) {
      assert.ok(p.category_name.includes('Gốm') || p.name.includes('Gốm'));
    }
  });

  it('tìm kiếm không có kết quả trả mảng rỗng', async () => {
    const res = await api('/products?q=zzzzz-khong-ton-tai');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 0);
    assert.deepEqual(res.body.data, []);
  });

  it('sắp xếp price_asc tăng dần', async () => {
    const res = await api('/products?sort=price_asc&limit=100');
    const prices = res.body.data
      .map((p: { current_price_vnd: number | null }) => p.current_price_vnd)
      .filter((v: number | null): v is number => v !== null);
    const sorted = [...prices].sort((a, b) => a - b);
    assert.deepEqual(prices, sorted);
  });

  it('sắp xếp price_desc giảm dần', async () => {
    const res = await api('/products?sort=price_desc&limit=100');
    const prices = res.body.data
      .map((p: { current_price_vnd: number | null }) => p.current_price_vnd)
      .filter((v: number | null): v is number => v !== null);
    const sorted = [...prices].sort((a, b) => b - a);
    assert.deepEqual(prices, sorted);
  });

  it('lọc khoảng giá loại sản phẩm ngoài khoảng', async () => {
    const res = await api('/products?min_price=100000&max_price=200000&limit=100');
    assert.equal(res.status, 200);
    for (const p of res.body.data) {
      assert.ok(p.current_price_vnd >= 100000 && p.current_price_vnd <= 200000);
    }
  });

  it('từ chối sort không hợp lệ với 400', async () => {
    const res = await api('/products?sort=DROP_TABLE');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('từ chối khoảng giá ngược với 400', async () => {
    const res = await api('/products?min_price=500000&max_price=1000');
    assert.equal(res.status, 400);
  });

  it('limit vượt 100 bị từ chối', async () => {
    const res = await api('/products?limit=500');
    assert.equal(res.status, 400);
  });

  it('GET chi tiết theo slug trả đủ ảnh và category_name', async () => {
    const res = await api('/products/bat-chiet-yeu-3dfddfe5');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.name, 'Bát Chiết Yêu');
    assert.ok(Array.isArray(res.body.data.images));
    assert.ok(res.body.data.images.length >= 1);
    assert.equal(res.body.data.category_name, 'Gốm sứ');
  });

  it('chi tiết không tồn tại trả 404', async () => {
    const res = await api('/products/khong-ton-tai');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('GET reviews trả summary và mảng data đúng shape', async () => {
    const res = await api('/products/bat-chiet-yeu-3dfddfe5/reviews');
    assert.equal(res.status, 200);
    assert.ok('summary' in res.body);
    assert.equal(typeof res.body.summary.review_count, 'number');
    assert.ok(Array.isArray(res.body.data));
  });

  it('reviews của sản phẩm không tồn tại trả 404', async () => {
    const res = await api('/products/khong-ton-tai/reviews');
    assert.equal(res.status, 404);
  });

  it('response envelope luôn có data', async () => {
    const res = await api('/products?limit=1');
    assert.ok('data' in res.body);
    assert.ok('meta' in res.body);
  });
});

// Dọn dữ liệu test sau khi tất cả suite chạy xong.
after(cleanupTestData);
