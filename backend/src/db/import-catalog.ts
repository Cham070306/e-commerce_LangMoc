import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { pool, withTransaction } from './pool.js';

const money=z.number().int().nonnegative().safe();
const catalogSchema=z.object({
  categories:z.array(z.object({id:z.string().uuid(),name:z.string(),slug:z.string()})),
  products:z.array(z.object({
    id:z.string().uuid(),category_id:z.string().uuid(),name:z.string().max(200),slug:z.string().max(220),
    sku:z.string().max(60).nullable(),price_vnd:money,sale_price_vnd:money.nullable(),
    description:z.string(),attributes:z.record(z.string(),z.string()),origin:z.string().max(100).nullable(),
    source_name:z.string().max(160),source_url:z.string(),collected_at:z.string().datetime({offset:true}),
    is_demo:z.boolean(),price_is_demo:z.boolean().optional().default(false),
    description_image_urls:z.array(z.string()).default([]),
    price_range_vnd:z.object({min:money,max:money}).nullable().optional(),
    images:z.array(z.object({url:z.string(),alt:z.string(),sort_order:z.number().int().nonnegative(),source_url:z.string().optional()})),
  }).refine(p=>p.sale_price_vnd===null||p.sale_price_vnd<p.price_vnd,'Giá giảm phải nhỏ hơn giá gốc')),
});

async function main(){
  const source=fileURLToPath(new URL('../../../frontend/mock/catalog.json',import.meta.url));
  const catalog=catalogSchema.parse(JSON.parse(await readFile(source,'utf8')));
  if(new Set(catalog.products.map(p=>p.slug)).size!==catalog.products.length)throw new Error('Trùng slug trong catalog nguồn.');
  const result=await withTransaction(async client=>{
    // Không xóa seed/custom products; giữ ID hiện có để không làm hỏng các khóa ngoại.
    const categories=new Map<string,string>();
    for(const c of catalog.categories){
      const row=await client.query<{id:string}>(`INSERT INTO categories(id,name,slug) VALUES($1,$2,$3)
        ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,[c.id,c.name,c.slug]);
      categories.set(c.id,row.rows[0]!.id);
    }
    for(const p of catalog.products){
      const categoryId=categories.get(p.category_id);
      if(!categoryId)throw new Error(`Không tìm thấy danh mục ${p.category_id}`);
      const row=await client.query<{id:string}>(`INSERT INTO products(
        id,category_id,name,slug,sku,price_vnd,sale_price_vnd,description,attributes,
        origin_province,source_name,source_url,collected_at,is_demo,price_is_demo,
        description_image_urls,price_range_vnd,stock_quantity,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,8,'active')
        ON CONFLICT(slug) DO UPDATE SET category_id=EXCLUDED.category_id,name=EXCLUDED.name,
        sku=EXCLUDED.sku,price_vnd=EXCLUDED.price_vnd,sale_price_vnd=EXCLUDED.sale_price_vnd,
        description=EXCLUDED.description,attributes=EXCLUDED.attributes,origin_province=EXCLUDED.origin_province,
        source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,collected_at=EXCLUDED.collected_at,
        is_demo=EXCLUDED.is_demo,price_is_demo=EXCLUDED.price_is_demo,
        description_image_urls=EXCLUDED.description_image_urls,price_range_vnd=EXCLUDED.price_range_vnd
        RETURNING id`,[p.id,categoryId,p.name,p.slug,p.sku,p.price_vnd,p.sale_price_vnd,p.description,
        JSON.stringify(p.attributes),p.origin,p.source_name,p.source_url,p.collected_at,p.is_demo,p.price_is_demo,
        JSON.stringify(p.description_image_urls),p.price_range_vnd?JSON.stringify(p.price_range_vnd):null]);
      const id=row.rows[0]!.id;
      await client.query('DELETE FROM product_images WHERE product_id=$1',[id]);
      for(const img of p.images){
        await client.query(`INSERT INTO product_images(product_id,image_url,alt_text,sort_order,source_url)
          VALUES($1,$2,$3,$4,$5)`,[id,img.url,img.alt,img.sort_order,img.source_url??null]);
      }
    }
    const count=await client.query<{total:string}>(`SELECT count(*)::text AS total FROM products`);
    return count.rows[0]!.total;
  });
  console.log(`Đã nhập ${catalog.products.length} sản phẩm từ catalog gốc. Tổng DB: ${result}.`);
  console.log('Giữ ID, tồn kho và trạng thái sản phẩm đã có; sản phẩm mới có tồn kho demo 8, không phải tồn kho thực.');
}
main().then(()=>pool.end()).catch(async error=>{console.error(error);await pool.end();process.exitCode=1;});
