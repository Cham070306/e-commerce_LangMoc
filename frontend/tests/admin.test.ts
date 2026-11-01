import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { demoCartItems, demoOrders, handleC2Mock } from '../mock/c2Mock.ts';
import { ORDER_STATUSES, getNextValidStatuses, isValidTransition } from '../src/lib/orderStatus.ts';

async function mockRequest(
  method: string,
  path: string,
  options: { cookie?: string; body?: unknown; idempotencyKey?: string } = {}
): Promise<{ status: number; body: any }> {
  const req = new PassThrough() as PassThrough & { method: string; headers: Record<string, string> };
  req.method = method;
  req.headers = {
    ...(options.cookie ? { cookie: options.cookie } : {}),
    ...(options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : {})
  };
  const res = { setHeader() {} };
  let result: { status: number; body: any } = { status: 0, body: null };
  const handled = handleC2Mock(req, res, new URL(`http://localhost/api/v1${path}`), (status, body) => {
    result = { status, body };
  });
  if (options.body === undefined) req.end();
  else req.end(JSON.stringify(options.body));
  assert.equal(await handled, true);
  return result;
}

test('Order status table only allows documented transitions', () => {
  assert.deepEqual(ORDER_STATUSES, ['pending', 'confirmed', 'packing', 'shipping', 'delivered', 'cancelled']);
  assert.deepEqual(getNextValidStatuses('pending'), ['confirmed', 'cancelled']);
  assert.equal(isValidTransition('pending', 'confirmed'), true);
  assert.equal(isValidTransition('pending', 'packing'), false);
  assert.equal(isValidTransition('delivered', 'cancelled'), false);
  assert.equal(isValidTransition('unknown', 'confirmed'), false);
});

test('Mock protects all admin routes with documented 401 and 403 errors', async () => {
  const unauthenticated = await mockRequest('GET', '/admin/orders');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.error.code, 'UNAUTHENTICATED');

  const customer = await mockRequest('GET', '/admin/orders', { cookie: 'vc_session=user-customer-minh' });
  assert.equal(customer.status, 403);
  assert.equal(customer.body.error.code, 'FORBIDDEN');
  const customerOnOtherAdminRoute = await mockRequest('GET', '/admin/reviews', { cookie: 'vc_session=user-customer-minh' });
  assert.equal(customerOnOtherAdminRoute.status, 403);
  assert.equal(customerOnOtherAdminRoute.body.error.code, 'FORBIDDEN');

  const admin = await mockRequest('GET', '/admin/orders', { cookie: 'vc_session=user-admin-langmoc' });
  assert.equal(admin.status, 200);
  assert.ok(admin.body.data.length > 0);
  assert.ok(admin.body.meta);
  const filtered = await mockRequest('GET', '/admin/orders?status=pending&page=1&limit=1', { cookie: 'vc_session=user-admin-langmoc' });
  assert.equal(filtered.body.data.length, 1);
  assert.equal(filtered.body.meta.limit, 1);
  assert.ok(filtered.body.meta.total > 1);
});

test('M3 COD order is visible to admin and status changes are visible in M4', async () => {
  const customerId = 'user-customer-minh';
  const productId = 'balo-phoi-vai-theu-tay-h-mong-d51e21fd';
  demoCartItems.push({ user_id: customerId, product_id: productId, quantity: 1 });

  const created = await mockRequest('POST', '/orders', {
    cookie: `vc_session=${customerId}`,
    idempotencyKey: 'm6a-cross-flow-test',
    body: { address_id: 'addr-demo-02', payment_method: 'cod' }
  });
  assert.equal(created.status, 201);
  const orderId = created.body.data.id as string;
  assert.equal(created.body.data.status, 'pending');
  assert.equal(created.body.data.payment_status, 'unpaid');

  const adminCookie = 'vc_session=user-admin-langmoc';
  const listed = await mockRequest('GET', '/admin/orders?status=pending&page=1&limit=12', { cookie: adminCookie });
  assert.ok(listed.body.data.some((order: { id: string }) => order.id === orderId));

  const confirmed = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'confirmed' }
  });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.status, 'confirmed');
  const packing = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'packing' }
  });
  assert.equal(packing.body.data.status, 'packing');

  const invalidJump = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'delivered' }
  });
  assert.equal(invalidJump.status, 409);
  assert.equal(invalidJump.body.error.code, 'CONFLICT');

  const withoutShipment = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'shipping' }
  });
  assert.equal(withoutShipment.status, 409);
  assert.equal(demoOrders.find(order => order.id === orderId)?.status, 'packing');

  const shipment = await mockRequest('PATCH', `/admin/orders/${orderId}/shipment`, {
    cookie: adminCookie,
    body: { carrier: 'Đơn vị giao thử', tracking_number: 'TRACK-M6A' }
  });
  assert.equal(shipment.status, 200);
  const shipping = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'shipping' }
  });
  assert.equal(shipping.status, 200);
  const delivered = await mockRequest('PATCH', `/admin/orders/${orderId}/status`, {
    cookie: adminCookie, body: { status: 'delivered' }
  });
  assert.equal(delivered.body.data.status, 'delivered');

  const customerOrders = await mockRequest('GET', '/me/orders?page=1&limit=100&status=delivered', {
    cookie: `vc_session=${customerId}`
  });
  const customerOrder = customerOrders.body.data.find((order: { id: string }) => order.id === orderId);
  assert.equal(customerOrder?.status, 'delivered');
  assert.equal(customerOrder?.payment_status, 'unpaid');
  assert.equal(demoOrders.find(order => order.id === orderId)?.payment_status, 'unpaid');
});

test('Admin can update shipment information separately with DB constraints', async () => {
  const adminCookie = 'vc_session=user-admin-langmoc';
  const order = demoOrders[0];
  assert.ok(order);

  // Validate carrier max 80, tracking_number max 100
  const invalidCarrier = await mockRequest('PATCH', `/admin/orders/${order.id}/shipment`, {
    cookie: adminCookie,
    body: { carrier: 'A'.repeat(81), tracking_number: 'TRACK-VALID' }
  });
  assert.equal(invalidCarrier.status, 400);
  assert.equal(invalidCarrier.body.error.code, 'VALIDATION_ERROR');

  const invalidTracking = await mockRequest('PATCH', `/admin/orders/${order.id}/shipment`, {
    cookie: adminCookie,
    body: { carrier: 'GHTK', tracking_number: 'B'.repeat(101) }
  });
  assert.equal(invalidTracking.status, 400);
  assert.equal(invalidTracking.body.error.code, 'VALIDATION_ERROR');

  // Update shipment separately without altering order.status
  const prevStatus = order.status;
  const updateShipment = await mockRequest('PATCH', `/admin/orders/${order.id}/shipment`, {
    cookie: adminCookie,
    body: { carrier: 'Viettel Post', tracking_number: 'VTP-998877' }
  });
  assert.equal(updateShipment.status, 200);
  assert.equal(updateShipment.body.data.shipment.carrier, 'Viettel Post');
  assert.equal(updateShipment.body.data.shipment.tracking_number, 'VTP-998877');
  assert.equal(updateShipment.body.data.status, prevStatus);
});

test('Admin Categories: create with slug, reject duplicate slug 409, toggle active/inactive', async () => {
  const adminCookie = 'vc_session=user-admin-langmoc';

  // 1. Get categories list
  const list = await mockRequest('GET', '/admin/categories', { cookie: adminCookie });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.data));

  // 2. Create category
  const testSlug = 'gom-su-trang-tri-' + Date.now();
  const created = await mockRequest('POST', '/admin/categories', {
    cookie: adminCookie,
    body: { name: 'Gốm Sứ Trang Trí', slug: testSlug, is_active: true }
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, 'Gốm Sứ Trang Trí');
  assert.equal(created.body.data.slug, testSlug);
  assert.equal(created.body.data.is_active, true);

  // 3. Reject duplicate slug with 409 CONFLICT
  const dup = await mockRequest('POST', '/admin/categories', {
    cookie: adminCookie,
    body: { name: 'Gốm Sứ Khác', slug: testSlug }
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, 'CONFLICT');

  // 4. Toggle active/inactive (no delete)
  const toggled = await mockRequest('PATCH', `/admin/categories/${created.body.data.id}`, {
    cookie: adminCookie,
    body: { is_active: false }
  });
  assert.equal(toggled.status, 200);
  assert.equal(toggled.body.data.is_active, false);
});

test('Admin Products: create with DB constraints, validate prices, toggle hidden, storefront sync', async () => {
  const adminCookie = 'vc_session=user-admin-langmoc';

  // 1. Validation errors
  const invalidPrice = await mockRequest('POST', '/admin/products', {
    cookie: adminCookie,
    body: {
      category_id: 'cat-gom-su',
      name: 'Ấm chén gốm mộc',
      slug: 'am-chen-gom-moc-' + Date.now(),
      price_vnd: -1000
    }
  });
  assert.equal(invalidPrice.status, 400);

  const invalidSalePrice = await mockRequest('POST', '/admin/products', {
    cookie: adminCookie,
    body: {
      category_id: 'cat-gom-su',
      name: 'Ấm chén gốm mộc',
      slug: 'am-chen-gom-moc-sale-' + Date.now(),
      price_vnd: 200000,
      sale_price_vnd: 250000 // sale_price must be < price
    }
  });
  assert.equal(invalidSalePrice.status, 400);

  // 2. Create product without image_url input
  const prodSlug = 'khay-tra-go-huong-' + Date.now();
  const created = await mockRequest('POST', '/admin/products', {
    cookie: adminCookie,
    body: {
      category_id: 'cat-do-go',
      name: 'Khay Trà Gỗ Hương Khảm Xà Cừ',
      slug: prodSlug,
      description: 'Chế tác thủ công từ gỗ hương tự nhiên.',
      material: 'Gỗ hương tự nhiên',
      origin_province: 'Bắc Ninh',
      price_vnd: 450000,
      sale_price_vnd: 390000,
      stock_quantity: 15,
      status: 'active'
    }
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.name, 'Khay Trà Gỗ Hương Khảm Xà Cừ');
  assert.equal(created.body.data.material, 'Gỗ hương tự nhiên');
  assert.equal(created.body.data.origin_province, 'Bắc Ninh');
  assert.equal(created.body.data.stock_quantity, 15);

  // 3. Toggle status to hidden (no delete)
  const hidden = await mockRequest('PATCH', `/admin/products/${created.body.data.id}`, {
    cookie: adminCookie,
    body: { status: 'hidden' }
  });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.data.status, 'hidden');

  // 4. Update stock and price, check sync
  const updated = await mockRequest('PATCH', `/admin/products/${created.body.data.id}`, {
    cookie: adminCookie,
    body: { price_vnd: 500000, stock_quantity: 25 }
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.price_vnd, 500000);
  assert.equal(updated.body.data.stock_quantity, 25);
});

test('Admin Reviews: approve to visible, hide to hidden, reject invalid status', async () => {
  const adminCookie = 'vc_session=user-admin-langmoc';

  // Get reviews
  const list = await mockRequest('GET', '/admin/reviews', { cookie: adminCookie });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);

  const reviewId = list.body.data[0].id;

  // Reject invalid status
  const invalid = await mockRequest('PATCH', `/admin/reviews/${reviewId}`, {
    cookie: adminCookie,
    body: { status: 'invalid_status' }
  });
  assert.equal(invalid.status, 400);

  // Approve to visible
  const visible = await mockRequest('PATCH', `/admin/reviews/${reviewId}`, {
    cookie: adminCookie,
    body: { status: 'visible' }
  });
  assert.equal(visible.status, 200);
  assert.equal(visible.body.data.status, 'visible');

  // Hide to hidden
  const hidden = await mockRequest('PATCH', `/admin/reviews/${reviewId}`, {
    cookie: adminCookie,
    body: { status: 'hidden' }
  });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.data.status, 'hidden');
});

test('Admin Contact: mark read, mark resolved, reject invalid status', async () => {
  const adminCookie = 'vc_session=user-admin-langmoc';

  // Get contact messages
  const list = await mockRequest('GET', '/admin/contact', { cookie: adminCookie });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);

  const msgId = list.body.data[0].id;

  // Reject invalid status
  const invalid = await mockRequest('PATCH', `/admin/contact/${msgId}`, {
    cookie: adminCookie,
    body: { status: 'pending' }
  });
  assert.equal(invalid.status, 400);

  // Mark read
  const read = await mockRequest('PATCH', `/admin/contact/${msgId}`, {
    cookie: adminCookie,
    body: { status: 'read' }
  });
  assert.equal(read.status, 200);
  assert.equal(read.body.data.status, 'read');

  // Mark resolved
  const resolved = await mockRequest('PATCH', `/admin/contact/${msgId}`, {
    cookie: adminCookie,
    body: { status: 'resolved' }
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.data.status, 'resolved');
});

