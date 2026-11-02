import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api, cleanupTestData, startServer, stopServer } from './helpers.js';

const DEMO = {
  admin: { email: 'admin@langmoc.local', password: 'Admin@123' },
  customer: { email: 'customer@langmoc.local', password: 'Customer@123' },
};

describe('Auth: register/login/logout/me', () => {
  before(startServer);
  after(stopServer);

  it('trả 401 khi /auth/me không có phiên', async () => {
    const res = await api('/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  it('đăng ký tài khoản mới trả 201 và role customer', async () => {
    const email = `user${Date.now()}@example.com`;
    const res = await api('/auth/register', {
      method: 'POST',
      body: { full_name: 'Người Dùng Test', email, password: 'Test@1234' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.email, email);
    assert.equal(res.body.data.role, 'customer');
    assert.equal(res.body.data.password_hash, undefined, 'không được trả password_hash');
  });

  it('đăng ký trùng email trả 409', async () => {
    const email = `dup${Date.now()}@example.com`;
    await api('/auth/register', { method: 'POST', body: { full_name: 'Trùng', email, password: 'Test@1234' } });
    const res = await api('/auth/register', {
      method: 'POST',
      body: { full_name: 'Trùng', email, password: 'Test@1234' },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('đăng ký với email sai trả 400 và có fields', async () => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: { full_name: 'Sai', email: 'khong-phai-email', password: '123' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.fields.email);
    assert.ok(res.body.error.fields.password);
  });

  it('đăng nhập đúng trả 200 và đặt cookie HttpOnly', async () => {
    const res = await api('/auth/login', { method: 'POST', body: DEMO.customer });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'customer');
    assert.ok(res.cookie.includes('langmoc_sid'), 'phải có cookie phiên');
  });

  it('đăng nhập sai mật khẩu trả 401', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: { email: DEMO.customer.email, password: 'sai-mat-khau' },
    });
    assert.equal(res.status, 401);
  });

  it('/auth/me trả hồ sơ khi có phiên và logout thu hồi phiên', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.customer });
    const me = await api('/auth/me', { cookie: login.cookie });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, DEMO.customer.email);

    const logout = await api('/auth/logout', { method: 'POST', cookie: login.cookie });
    assert.equal(logout.status, 204);

    const afterLogout = await api('/auth/me', { cookie: login.cookie });
    assert.equal(afterLogout.status, 401, 'session phải bị thu hồi sau logout');
  });
});

describe('Phân quyền admin/customer', () => {
  before(startServer);
  after(stopServer);

  it('khách chưa đăng nhập bị 401 khi vào admin', async () => {
    const res = await api('/admin/products');
    assert.equal(res.status, 401);
  });

  it('customer bị 403 khi vào admin', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.customer });
    const res = await api('/admin/products', { cookie: login.cookie });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('admin truy cập được danh sách admin', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.admin });
    const res = await api('/admin/products', { cookie: login.cookie });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.total >= 12);
  });

  it('admin tạo/sửa danh mục và sản phẩm', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.admin });
    const cat = await api('/admin/categories', {
      method: 'POST',
      cookie: login.cookie,
      body: { name: `Danh Mục Test ${Date.now()}` },
    });
    assert.equal(cat.status, 201);
    assert.match(cat.body.data.slug, /^danh-muc-test/);

    const product = await api('/admin/products', {
      method: 'POST',
      cookie: login.cookie,
      body: {
        name: `Sản Phẩm Test ${Date.now()}`,
        category_id: cat.body.data.id,
        price_vnd: 150000,
        stock_quantity: 7,
        status: 'active',
      },
    });
    assert.equal(product.status, 201);
    assert.equal(product.body.data.stock_quantity, 7);

    const patched = await api(`/admin/products/${product.body.data.id}`, {
      method: 'PATCH',
      cookie: login.cookie,
      body: { price_vnd: 120000, stock_quantity: 4 },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.price_vnd, 120000);
    assert.equal(patched.body.data.stock_quantity, 4);

    // Dọn dẹp phần còn lại do cleanupTestData đảm nhiệm sau toàn bộ suite.
  });

  it('admin không đặt giá giảm lớn hơn giá gốc', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.admin });
    const list = await api('/admin/products', { cookie: login.cookie });
    const target = list.body.data[0];
    const res = await api(`/admin/products/${target.id}`, {
      method: 'PATCH',
      cookie: login.cookie,
      body: { sale_price_vnd: target.price_vnd + 1 },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('Địa chỉ của người dùng', () => {
  before(startServer);
  after(stopServer);

  it('chưa đăng nhập không xem được địa chỉ', async () => {
    const res = await api('/me/addresses');
    assert.equal(res.status, 401);
  });

  it('customer xem và tạo được địa chỉ của mình', async () => {
    const login = await api('/auth/login', { method: 'POST', body: DEMO.customer });
    const list = await api('/me/addresses', { cookie: login.cookie });
    assert.equal(list.status, 200);
    assert.ok(list.body.data.length >= 1);

    const created = await api('/me/addresses', {
      method: 'POST',
      cookie: login.cookie,
      body: {
        recipient_name: 'Người Nhận Test',
        phone: '0912345678',
        province: 'Hà Nội',
        district: 'Hoàn Kiếm',
        ward: 'Hàng Bài',
        address_line: 'Số 10 Tràng Tiền',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.province, 'Hà Nội');

    const deleted = await api(`/me/addresses/${created.body.data.id}`, {
      method: 'DELETE',
      cookie: login.cookie,
    });
    assert.equal(deleted.status, 204);
  });
});

// Dọn dữ liệu test sau khi tất cả suite chạy xong.
after(cleanupTestData);
