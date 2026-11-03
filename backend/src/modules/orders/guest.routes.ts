import {Router, type Request, type Response} from 'express';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolClient} from 'pg';
import {asyncHandler} from '../../common/async-handler.js';
import {AppError} from '../../common/errors.js';
import {sendData} from '../../common/http.js';
import {withTransaction} from '../../db/pool.js';
import {config} from '../../config/env.js';

const itemsSchema=z.array(z.object({product_id:z.string().uuid(),quantity:z.number().int().min(1).max(100)}).strict())
  .min(1,'Giỏ hàng đang trống').max(50).refine(items=>new Set(items.map(i=>i.product_id)).size===items.length,'Sản phẩm bị trùng');
const previewSchema=z.object({items:itemsSchema}).strict();
const orderSchema=z.object({
  items:itemsSchema,recipient_name:z.string().trim().min(2).max(120),
  phone:z.string().regex(/^0[235789][0-9]{8}$/,'Số điện thoại phải gồm 10 chữ số hợp lệ'),
  address_line:z.string().trim().min(5).max(255),note:z.string().trim().max(1000).optional(),
}).strict();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const cookieName='langmoc_guest';
function guestSession(req:Request,res:Response,create=false){
  let token=req.cookies?.[cookieName];
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token)){
    if(!create)throw AppError.unauthenticated('Vui lòng tải lại bước thanh toán trước khi đặt hàng.');
    token=randomBytes(32).toString('hex');
    res.cookie(cookieName,token,{httpOnly:true,sameSite:'lax',secure:config.cookieSecure,path:'/api/v1/guest',maxAge:7*86400000});
  }
  return hash(token);
}
type ProductRow={id:string;name:string;price_vnd:string;sale_price_vnd:string|null;stock_quantity:number;seller_id:string|null;image_url:string|null};
async function priceCart(client:PoolClient,items:z.infer<typeof itemsSchema>,lock=false){
  const {rows}=await client.query<ProductRow>(`SELECT p.id,p.name,p.seller_id,p.stock_quantity,
    p.price_vnd,(CASE WHEN (p.sale_starts_at IS NULL OR p.sale_starts_at<=now())
      AND (p.sale_ends_at IS NULL OR p.sale_ends_at>=now()) THEN p.sale_price_vnd ELSE NULL END) AS sale_price_vnd,
    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order LIMIT 1) AS image_url
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=ANY($1::uuid[]) AND p.status='active' AND c.is_active
    ORDER BY p.id ${lock?'FOR UPDATE OF p':''}`,[items.map(i=>i.product_id)]);
  if(rows.length!==items.length)throw AppError.conflict('Một sản phẩm đã ngừng bán. Vui lòng kiểm tra lại giỏ hàng.');
  const lines=items.map(item=>{
    const p=rows.find(p=>p.id===item.product_id)!;
    if(item.quantity>p.stock_quantity)throw AppError.conflict(`Sản phẩm ${p.name} không đủ tồn kho.`);
    const unit=Number(p.sale_price_vnd??p.price_vnd);
    return {...p,quantity:item.quantity,unit_price_vnd:unit,line_total_vnd:unit*item.quantity};
  });
  const subtotal=lines.reduce((n,p)=>n+p.line_total_vnd,0);
  if(!Number.isSafeInteger(subtotal)||subtotal>1_000_000_000)throw AppError.validation('Giá trị đơn hàng vượt giới hạn.');
  return {lines,preview:{subtotal_vnd:subtotal,discount_vnd:0,shipping_fee_vnd:30000,total_vnd:subtotal+30000}};
}
async function readOrder(client:PoolClient,id:string){
  const result=await client.query('SELECT * FROM orders WHERE id=$1',[id]);
  const row=result.rows[0];
  const items=await client.query('SELECT id,product_id,product_name,product_image_url,unit_price_vnd,quantity,line_total_vnd FROM order_items WHERE order_id=$1 ORDER BY id',[id]);
  const {guest_session_hash,request_fingerprint,idempotency_key,...order}=row;
  for(const key of ['subtotal_vnd','discount_vnd','shipping_fee_vnd','total_vnd'])order[key]=Number(order[key]);
  return {...order,items:items.rows.map(item=>({...item,unit_price_vnd:Number(item.unit_price_vnd),line_total_vnd:Number(item.line_total_vnd)}))};
}
export const guestRouter=Router();
guestRouter.post('/checkout/preview',asyncHandler(async(req,res)=>{
  const {items}=previewSchema.parse(req.body);
  guestSession(req,res,true);
  const result=await withTransaction(client=>priceCart(client,items));
  sendData(res,result.preview);
}));
guestRouter.post('/orders',asyncHandler(async(req,res)=>{
  const input=orderSchema.parse(req.body);
  const key=z.string().uuid('Idempotency-Key phải là UUID').parse(req.get('Idempotency-Key'));
  const session=guestSession(req,res);
  const fingerprint=hash(JSON.stringify({...input,note:input.note??'',items:[...input.items].sort((a,b)=>a.product_id.localeCompare(b.product_id))}));
  const result=await withTransaction(async client=>{
    // Khóa theo phiên: retry/đặt đồng thời được tuần tự hóa và kiểm tra lại tồn kho.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[session]);
    const previous=await client.query('SELECT id,request_fingerprint FROM orders WHERE user_id IS NULL AND guest_session_hash=$1 AND idempotency_key=$2',[session,key]);
    if(previous.rows.length){
      if(previous.rows[0].request_fingerprint!==fingerprint)throw AppError.conflict('Khóa đặt hàng đã dùng với nội dung khác.');
      return {order:await readOrder(client,previous.rows[0].id),created:false};
    }
    const recent=await client.query('SELECT count(*)::int AS n FROM orders WHERE guest_session_hash=$1 AND created_at>now()-interval \'1 minute\'',[session]);
    if(recent.rows[0].n>=5)throw new AppError(429,'RATE_LIMITED','Bạn đã đặt nhiều đơn liên tiếp. Vui lòng thử lại sau một phút.');
    const {lines,preview}=await priceCart(client,input.items,true);
    const number=`LM-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomBytes(8).toString('hex')}`;
    const id=randomUUID();
    await client.query(`INSERT INTO orders(id,order_number,user_id,recipient_name,phone,shipping_address,note,
      payment_method,subtotal_vnd,discount_vnd,shipping_fee_vnd,total_vnd,idempotency_key,guest_session_hash,request_fingerprint)
      VALUES($1,$2,NULL,$3,$4,$5,$6,'cod',$7,0,$8,$9,$10,$11,$12)`,
      [id,number,input.recipient_name,input.phone,input.address_line,input.note??null,preview.subtotal_vnd,preview.shipping_fee_vnd,preview.total_vnd,key,session,fingerprint]);
    for(const line of lines){
      await client.query(`INSERT INTO order_items(order_id,product_id,seller_id,product_name,product_image_url,unit_price_vnd,quantity,line_total_vnd)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,line.id,line.seller_id,line.name,line.image_url,line.unit_price_vnd,line.quantity,line.line_total_vnd]);
      await client.query('UPDATE products SET stock_quantity=stock_quantity-$1 WHERE id=$2',[line.quantity,line.id]);
    }
    return {order:await readOrder(client,id),created:true};
  });
  sendData(res,result.order,result.created?201:200);
}));
