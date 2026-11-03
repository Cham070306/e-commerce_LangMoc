import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../../',import.meta.url);
const source=JSON.parse(await readFile(new URL('frontend/mock/catalog.json',root),'utf8'));
const base=process.env.API_BASE_URL??'http://127.0.0.1:4000/api/v1';
const products=[];
let total=0;
for(let page=1;page===1||products.length<total;page++){
  const response=await fetch(`${base}/products?page=${page}&limit=100`);
  assert.equal(response.status,200);
  const result=await response.json();
  total=result.meta.total;
  assert.ok(result.data.length,'Phân trang dừng trước khi lấy đủ sản phẩm');
  products.push(...result.data);
}
assert.equal(products.length,total);
assert.equal(new Set(products.map(p=>p.id)).size,total,'Phân trang bị trùng sản phẩm');
const bySlug=new Map(products.map(p=>[p.slug,p]));
let images=0,descriptionImages=0;
for(const expected of source.products){
  const actual=bySlug.get(expected.slug);
  assert.ok(actual,`Thiếu ${expected.slug}`);
  for(const key of ['name','sku','description','attributes','price_vnd','sale_price_vnd','current_price_vnd','origin','source_name','source_url','is_demo','description_image_urls']){
    assert.deepEqual(actual[key],expected[key],`${expected.slug}: ${key}`);
  }
  assert.equal(actual.price_is_demo,expected.price_is_demo??false);
  assert.equal(actual.category_name,expected.category_name);
  assert.equal(Date.parse(actual.collected_at),Date.parse(expected.collected_at));
  const normalizeImages=items=>items.map(i=>({...i,source_url:i.source_url??null}));
  assert.deepEqual(normalizeImages(actual.images),normalizeImages(expected.images),`${expected.slug}: images`);
  for(const image of [...actual.images.map(i=>i.url),...actual.description_image_urls]){
    if(image.startsWith('/'))await access(fileURLToPath(new URL('frontend/public'+image,root)));
  }
  images+=actual.images.length;
  descriptionImages+=actual.description_image_urls.length;
}
console.log(`PASS: đủ ${source.products.length}/${source.products.length} sản phẩm gốc trên API live; tổng ${total}.`);
console.log(`PASS: tên, mô tả, danh mục, giá, nguồn, ${images} ảnh gallery và ${descriptionImages} ảnh nội dung khớp nguồn; ảnh local tồn tại.`);
