import test from 'node:test';
import assert from 'node:assert/strict';
import { planCartMerge, type LocalCartItem, type ServerCartItem } from '../src/features/cart/mergeCart.ts';

const dummyItem1: LocalCartItem = {
  id: 'prod-01',
  slug: 'binh-hoa-gom-chu-dau',
  name: 'Bình hoa gốm Chu Đậu',
  image: '/images/products/01.jpg',
  price: 250000,
  quantity: 2
};

const dummyItem2: LocalCartItem = {
  id: 'prod-02',
  slug: 'non-la-lang-chuong',
  name: 'Nón lá làng Chuông',
  image: '/images/products/02.jpg',
  price: 120000,
  quantity: 3
};

test('planCartMerge: giỏ local rỗng -> không có thao tác PUT nào', () => {
  const serverCart: ServerCartItem[] = [
    {
      product_id: 'prod-01',
      product_slug: 'binh-hoa-gom-chu-dau',
      product_name: 'Bình hoa gốm Chu Đậu',
      image_url: '/images/products/01.jpg',
      price_vnd: 250000,
      quantity: 1,
      stock_quantity: 10
    }
  ];
  const plan = planCartMerge([], serverCart);
  assert.equal(plan.itemsToPut.length, 0);
  assert.equal(plan.blockedItems.length, 0);
});

test('planCartMerge: giỏ server rỗng -> giữ nguyên số lượng từ giỏ local', () => {
  const plan = planCartMerge([dummyItem1, dummyItem2], []);
  assert.equal(plan.itemsToPut.length, 2);
  assert.equal(plan.itemsToPut[0].productId, 'prod-01');
  assert.equal(plan.itemsToPut[0].targetQuantity, 2);
  assert.equal(plan.itemsToPut[1].productId, 'prod-02');
  assert.equal(plan.itemsToPut[1].targetQuantity, 3);
  assert.equal(plan.itemsToPut[0].cappedByStock, false);
});

test('planCartMerge: trùng món -> cộng dồn số lượng local + server', () => {
  const serverCart: ServerCartItem[] = [
    {
      product_id: 'prod-01',
      product_slug: 'binh-hoa-gom-chu-dau',
      product_name: 'Bình hoa gốm Chu Đậu',
      image_url: '/images/products/01.jpg',
      price_vnd: 250000,
      quantity: 3,
      stock_quantity: 10
    }
  ];
  // local có 2 món prod-01, server có 3 món prod-01 -> tổng phải là 5
  const plan = planCartMerge([dummyItem1], serverCart, { 'prod-01': 10 });
  assert.equal(plan.itemsToPut.length, 1);
  assert.equal(plan.itemsToPut[0].productId, 'prod-01');
  assert.equal(plan.itemsToPut[0].serverCurrentQty, 3);
  assert.equal(plan.itemsToPut[0].localAddQty, 2);
  assert.equal(plan.itemsToPut[0].targetQuantity, 5);
  assert.equal(plan.itemsToPut[0].cappedByStock, false);
});

test('planCartMerge: vượt tồn kho -> giới hạn số lượng bằng mức tồn kho tối đa', () => {
  const serverCart: ServerCartItem[] = [
    {
      product_id: 'prod-01',
      product_slug: 'binh-hoa-gom-chu-dau',
      product_name: 'Bình hoa gốm Chu Đậu',
      image_url: '/images/products/01.jpg',
      price_vnd: 250000,
      quantity: 3,
      stock_quantity: 4
    }
  ];
  // local có 2 món, server có 3 món (tổng mong muốn = 5), nhưng tồn kho chỉ có 4
  const plan = planCartMerge([dummyItem1], serverCart, { 'prod-01': 4 });
  assert.equal(plan.itemsToPut.length, 1);
  assert.equal(plan.itemsToPut[0].targetQuantity, 4);
  assert.equal(plan.itemsToPut[0].cappedByStock, true);
});

test('planCartMerge: sản phẩm hết hàng hoặc server đã đạt max tồn kho -> đưa vào blockedItems', () => {
  const outOfStockItem: LocalCartItem = {
    id: 'prod-out-of-stock',
    slug: 'bat-trang-co',
    name: 'Bát Tràng Cổ',
    image: '',
    price: 300000,
    quantity: 1
  };
  const plan = planCartMerge([outOfStockItem], [], { 'prod-out-of-stock': 0 });
  assert.equal(plan.itemsToPut.length, 0);
  assert.equal(plan.blockedItems.length, 1);
  assert.equal(plan.blockedItems[0].item.id, 'prod-out-of-stock');
});
