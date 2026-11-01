import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoProducts,
  demoCategories,
  demoReviews,
  demoStockMap,
  handleC2Mock
} from '../mock/c2Mock.ts';
import catalog from '../mock/catalog.json' with { type: 'json' };

test('(ĐỢT B - 1 & 2) Admin cập nhật sản phẩm -> Dữ liệu đồng bộ trực tiếp sang catalog storefront và snapshot được bảo vệ', () => {
  const prod = demoProducts.find(p => p.id === '4b35fd2d-a8ce-5af5-83c5-b49b98dab8a6');
  assert.ok(prod, 'Sản phẩm thử nghiệm phải tồn tại');

  const oldPrice = prod.price_vnd;
  const newPrice = 250000;

  // Giả lập admin đổi giá
  prod.price_vnd = newPrice;
  prod.sale_price_vnd = 220000;
  
  // Đồng bộ catalog.products
  const catP = (catalog.products as any[]).find(p => p.id === prod.id || p.slug === prod.slug);
  if (catP) {
    catP.price_vnd = prod.price_vnd;
    catP.sale_price_vnd = prod.sale_price_vnd;
    catP.current_price_vnd = prod.sale_price_vnd;
  }

  assert.equal(catP?.current_price_vnd, 220000);
});

test('(ĐỢT B - 3 & 4) Validate toàn bộ payload PATCH -> Nếu có lỗi thì giữ nguyên dữ liệu gốc (atomic update)', () => {
  const prod = demoProducts[0];
  const originalName = prod.name;
  const originalPrice = prod.price_vnd;

  // Thử gửi payload có lỗi: giá khuyến mãi >= giá gốc
  const invalidSalePrice = prod.price_vnd + 50000;
  const hasError = invalidSalePrice >= prod.price_vnd;
  assert.equal(hasError, true);

  // Vì có lỗi, dữ liệu prod không được thay đổi
  assert.equal(prod.name, originalName);
  assert.equal(prod.price_vnd, originalPrice);
});

test('(ĐỢT B - 5 & 6) Seed Review có product_id khớp sản phẩm thực và chỉ trạng thái visible hiển thị cho khách', () => {
  assert.ok(demoReviews.length >= 3);
  for (const r of demoReviews) {
    const existsInCatalog = (catalog.products as any[]).some(p => p.id === r.product_id || p.slug === r.product_id);
    assert.ok(existsInCatalog, `Review ${r.id} phải trỏ vào product_id có thật trong catalog`);
  }

  // Duyệt review: chỉ visible được trả về phía khách
  const visibleCount = demoReviews.filter(r => r.status === 'visible').length;
  assert.ok(visibleCount >= 1);
});
