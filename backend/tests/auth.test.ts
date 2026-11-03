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
    assert.ok(res.cookie.includes('langmoc_sid'), 'đăng ký phải tạo phiên như UI yêu cầu');
    const me=await api('/auth/me',{cookie:res.cookie});
    assert.equal(me.status,200);
    assert.equal(me.body.data.id,res.body.data.id);
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
        images:[{url:'/images/crafts/13-bamboo-market.jpeg',alt:'Ảnh kiểm thử',sort_order:0}],
        category_id: cat.body.data.id,
        price_vnd: 150000,
        stock_quantity: 7,
        status: 'active',
      },
    });
    assert.equal(product.status, 201);
    assert.equal(product.body.data.stock_quantity, 7);
    assert.equal(product.body.data.images[0].url,'/images/crafts/13-bamboo-market.jpeg');
    for(const key of ['material','origin_province','sale_starts_at','sale_ends_at','seller_id','created_at','updated_at']){
      assert.ok(key in product.body.data,`admin thiếu trường ${key}`);
    }

    const patched = await api(`/admin/products/${product.body.data.id}`, {
      method: 'PATCH',
      cookie: login.cookie,
      body: { price_vnd: 120000, stock_quantity: 4 },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.price_vnd, 120000);
    assert.equal(patched.body.data.stock_quantity, 4);
    const invalidImage=await api(`/admin/products/${product.body.data.id}`,{method:'PATCH',cookie:login.cookie,body:{images:[{url:'javascript:alert(1)'}]}});
    assert.equal(invalidImage.status,400);
    const gallery=await api(`/admin/products/${product.body.data.id}`,{method:'PATCH',cookie:login.cookie,body:{images:[{url:'/images/crafts/14-kim-son-seagrass.jpeg',alt:'Ảnh mới',sort_order:0}]}});
    assert.equal(gallery.status,200);assert.equal(gallery.body.data.images.length,1);
    assert.equal(gallery.body.data.images[0].alt,'Ảnh mới');
    const detail=await api(`/products/${product.body.data.slug}`);assert.deepEqual(detail.body.data.images,gallery.body.data.images);


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

  it('admin phân trang không trùng sản phẩm và từ chối query sai',async()=>{
    const login=await api('/auth/login',{method:'POST',body:DEMO.admin});
    const first=await api('/admin/products?page=1&limit=2',{cookie:login.cookie});
    const second=await api('/admin/products?page=2&limit=2',{cookie:login.cookie});
    assert.equal(first.body.data.length,2);
    assert.equal(second.body.meta.page,2);
    assert.equal(second.body.meta.limit,2);
    assert.equal(first.body.meta.total,second.body.meta.total);
    const ids=new Set(first.body.data.map((p:{id:string})=>p.id));
    assert.ok(second.body.data.every((p:{id:string})=>!ids.has(p.id)));
    assert.equal((await api('/admin/products?page=0',{cookie:login.cookie})).status,400);
    assert.equal((await api('/admin/products?category_id=bad',{cookie:login.cookie})).status,400);
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
        ward: 'Hoàn Kiếm',
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

  it('chặn số điện thoại sai và không cho xóa địa chỉ người khác', async()=>{
    const customer=await api('/auth/login',{method:'POST',body:DEMO.customer});
    const admin=await api('/auth/login',{method:'POST',body:DEMO.admin});
    const list=await api('/me/addresses',{cookie:customer.cookie});
    const denied=await api(`/me/addresses/${list.body.data[0].id}`,{method:'DELETE',cookie:admin.cookie});
    assert.equal(denied.status,404);
    for(const phone of ['+84901234567','090 123 4567','0123456789','090123456']){
      const res=await api('/me/addresses',{method:'POST',cookie:customer.cookie,body:{
        recipient_name:'Người Nhận Test',phone,province:'TP.HCM',district:'Tân Bình',ward:'Tân Bình',address_line:'57 Bàu Cát 6'
      }});
      assert.equal(res.status,400);
      assert.ok(res.body.error.fields.phone);
    }
  });

  it('địa chỉ mới dùng tỉnh/xã hợp lệ, không cần quận và từ chối cặp sai',async()=>{
    const customer=await api('/auth/login',{method:'POST',body:DEMO.customer});
    const body={recipient_name:'Người Nhận Test',phone:'0901234567',province:'Hồ Chí Minh',ward:'Tân Bình',address_line:'Địa chỉ kiểm thử'};
    const good=await api('/me/addresses',{method:'POST',cookie:customer.cookie,body});
    assert.equal(good.status,201);assert.equal(good.body.data.district,'');
    for(const bad of [{...body,province:'Tỉnh không tồn tại'},{...body,ward:'Hoàn Kiếm'}]){
      const res=await api('/me/addresses',{method:'POST',cookie:customer.cookie,body:bad});assert.equal(res.status,400);
    }
    await api(`/me/addresses/${good.body.data.id}`,{method:'DELETE',cookie:customer.cookie});
  });

  it('tạo mặc định đồng thời rồi xóa vẫn còn đúng một địa chỉ mặc định',async()=>{
    const registered=await api('/auth/register',{method:'POST',body:{
      full_name:'Người Test',email:`useraddress${Date.now()}@example.com`,password:'Test@1234'
    }});
    const cookie=registered.cookie;
    const created=await Promise.all([1,2].map(i=>api('/me/addresses',{method:'POST',cookie,body:{
      recipient_name:`Người Nhận Test ${i}`,phone:'0901234567',province:'TP.HCM',district:'Tân Bình',ward:'Tân Bình',address_line:'57 Bàu Cát 6',is_default:true
    }})));
    assert.ok(created.every(r=>r.status===201));
    const before=await api('/me/addresses',{cookie});
    assert.equal(before.body.data.filter((a:{is_default:boolean})=>a.is_default).length,1);
    const current=before.body.data.find((a:{is_default:boolean})=>a.is_default);
    assert.equal((await api(`/me/addresses/${current.id}`,{method:'DELETE',cookie})).status,204);
    const afterDelete=await api('/me/addresses',{cookie});
    assert.equal(afterDelete.body.data.length,1);
    assert.equal(afterDelete.body.data[0].is_default,true);
  });
});

// Dọn dữ liệu test sau khi tất cả suite chạy xong.
after(cleanupTestData);
