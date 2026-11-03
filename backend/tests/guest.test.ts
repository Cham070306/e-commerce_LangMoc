import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {api,startServer,stopServer} from './helpers.js';
import {pool} from '../src/db/pool.js';
const productId=randomUUID(),categoryId=randomUUID();
const items=[{product_id:productId,quantity:1}];
const body={items,recipient_name:'Khách kiểm thử',phone:'0901234567',address_line:'57 Bàu Cát 6, Tân Bình, TP.HCM'};
before(async()=>{
  await pool.query('INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)',[categoryId,'Guest Test',`guest-${categoryId}`]);
  await pool.query(`INSERT INTO products(id,category_id,name,slug,price_vnd,stock_quantity,status)
    VALUES($1,$2,'Sản Phẩm Guest Test',$3,100000,50,'active')`,[productId,categoryId,`guest-${productId}`]);
  await startServer();
});
after(async()=>{
  await stopServer();
  await pool.query('DELETE FROM orders WHERE id IN (SELECT order_id FROM order_items WHERE product_id=$1)',[productId]);
  await pool.query('DELETE FROM products WHERE id=$1',[productId]);
  await pool.query('DELETE FROM categories WHERE id=$1',[categoryId]);
  await pool.end();
});
async function preview(){return api('/guest/checkout/preview',{method:'POST',body:{items}});}
async function create(cookie:string,key=randomUUID(),payload:unknown=body){
  return api('/guest/orders',{method:'POST',cookie,headers:{'Idempotency-Key':key},body:payload});
}
test('khách preview giá server, tạo đơn DB và retry không trừ tồn lần hai',async()=>{
  const p=await preview();assert.equal(p.status,200);assert.equal(p.body.data.total_vnd,130000);assert.ok(p.cookie);
  const stock=await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[productId]);
  const key=randomUUID();
  const [a,b]=await Promise.all([create(p.cookie,key),create(p.cookie,key)]);
  assert.deepEqual([a.status,b.status].sort(),[200,201]);
  assert.equal(a.body.data.id,b.body.data.id);assert.equal(a.body.data.user_id,null);
  assert.equal(a.body.data.total_vnd,130000);assert.equal(a.body.data.items[0].unit_price_vnd,100000);
  assert.equal(a.body.data.guest_session_hash,undefined);
  assert.equal((await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[productId])).rows[0].stock_quantity,stock.rows[0].stock_quantity-1);
  assert.equal((await create(p.cookie,key,{...body,note:'Nội dung thay đổi'})).status,409);
});
test('chặn giỏ rỗng, sản phẩm trùng, điện thoại sai, giá client tự gửi và thiếu phiên',async()=>{
  assert.equal((await api('/guest/checkout/preview',{method:'POST',body:{items:[]}})).status,400);
  assert.equal((await api('/guest/checkout/preview',{method:'POST',body:{items:[...items,...items]}})).status,400);
  assert.equal((await create('')).status,401);
  const p=await preview();
  assert.equal((await create(p.cookie,randomUUID(),{...body,phone:'123'})).status,400);
  assert.equal((await create(p.cookie,randomUUID(),{...body,total_vnd:1})).status,400);
});
test('khách không mua sản phẩm ẩn và không vượt tồn',async()=>{
  const p=await preview();
  await pool.query("UPDATE products SET status='hidden' WHERE id=$1",[productId]);
  assert.equal((await create(p.cookie)).status,409);
  await pool.query("UPDATE products SET status='active',stock_quantity=1 WHERE id=$1",[productId]);
  assert.equal((await create(p.cookie,randomUUID(),{...body,items:[{product_id:productId,quantity:2}]})).status,409);
  assert.equal((await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[productId])).rows[0].stock_quantity,1);
});
test('hai khách tranh sản phẩm cuối: chỉ một đơn thành công',async()=>{
  const [p,q]=await Promise.all([preview(),preview()]);
  const [a,b]=await Promise.all([create(p.cookie),create(q.cookie)]);
  assert.deepEqual([a.status,b.status].sort(),[201,409]);
  assert.equal((await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[productId])).rows[0].stock_quantity,0);
});
