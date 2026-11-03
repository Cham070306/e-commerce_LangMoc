import test from 'node:test';
import assert from 'node:assert/strict';
import { CartUpdates } from '../src/lib/cartUpdates.ts';
import { loginDestination, redirectToLogin } from '../src/lib/loginRedirect.ts';
import { isImageUrl } from '../src/lib/imageUrls.ts';
import { readFileSync } from 'node:fs';

test('StrictMode redirect chạy hai lần vẫn giữ đích admin; xử lý URL login lồng cũ', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis,'window');
  const location = { hash:'#/admin/products' };
  Object.defineProperty(globalThis,'window',{value:{location},configurable:true});
  try {
    redirectToLogin();const first=location.hash;redirectToLogin();assert.equal(location.hash,first);
    location.hash='#/';redirectToLogin();assert.equal(location.hash,'#/');
    assert.equal(loginDestination('/login?redirect=%2Fadmin%2Fproducts'),'/admin/products');
    assert.equal(loginDestination('/login?redirect=%2Flogin%3Fredirect%3D%252Fcheckout'),'/checkout');
    for(const value of ['//evil.test','/\\evil.test','https://evil.test'])assert.equal(loginDestination(value),'/');
  } finally { if(original)Object.defineProperty(globalThis,'window',original);else delete (globalThis as any).window; }
});

test('checkout chờ PUT đang chạy; nhiều lần đổi lượng cùng món không ghi sai thứ tự', async () => {
  const queue=new CartUpdates();let release!:()=>void;let quantity=1;
  const first=queue.run('item',async()=>{await new Promise<void>(resolve=>{release=resolve});quantity=2});
  await Promise.resolve();
  const second=queue.run('item',async()=>{quantity=1});let previewRead=false;
  const preview=queue.wait().then(()=>{previewRead=true;return quantity});
  await Promise.resolve();assert.equal(previewRead,false);release();
  await Promise.all([first,second]);assert.equal(await preview,1);assert.equal(queue.has('item'),false);
});

test('lỗi ghi giỏ ngăn bước chờ checkout; có thể thử lại sau lỗi',async()=>{
  const queue=new CartUpdates();const failed=queue.run('item',async()=>{throw new Error('network')});
  await assert.rejects(queue.wait(),/network/);await assert.rejects(failed,/network/);
  assert.equal(await queue.run('item',async()=>3),3);
});

test('ảnh quản trị chỉ nhận URL ảnh http(s) hoặc ảnh local',()=>{
  for(const url of ['/images/crafts/13-bamboo-market.jpeg','https://example.test/photo.jpg'])assert.equal(isImageUrl(url),true);
  for(const url of ['javascript:alert(1)','data:text/html,test','//example.test/p.png','/images/../secret',''])assert.equal(isImageUrl(url),false);
});

test('snapshot địa chỉ frontend/backend giống nhau, mã duy nhất và đủ tỉnh/xã',()=>{
  const front=readFileSync(new URL('../src/data/vietnam-addresses.json',import.meta.url),'utf8');
  const back=readFileSync(new URL('../../backend/src/data/vietnam-addresses.json',import.meta.url),'utf8');
  assert.equal(front,back);const provinces=JSON.parse(front);assert.equal(provinces.length,34);
  const wards=provinces.flatMap((p:any)=>p.wards);assert.equal(wards.length,3321);
  assert.equal(new Set(wards.map((w:any)=>w.code)).size,3321);
  assert.ok(provinces.find((p:any)=>p.name==='Hồ Chí Minh').wards.some((w:any)=>w.name==='Tân Bình'));
});
