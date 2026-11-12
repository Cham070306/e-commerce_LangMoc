import {createHash, createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {ApiError, conflict, invalid, missing, text, uuid, money, monetary, transaction, lockCart, pagination} from '../../common/c4.mjs';
import {cartRows, currentPrice} from '../cart/service.mjs';
import {getPromotion, discountFor} from '../promotions/service.mjs';

export const ORDER_STATUSES = ['pending','confirmed','packing','shipping','delivered','cancelled'];
const transitions = {pending:['confirmed','cancelled'], confirmed:['packing'], packing:['shipping'], shipping:['delivered'], delivered:[], cancelled:[]};
const fingerprint = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
function checkoutInput(body, needsAddress = true) {
  if (body.payment_method !== undefined && body.payment_method !== 'cod') throw invalid('MVP chỉ hỗ trợ COD');
  return {address_id: body.address_id ? uuid(body.address_id) : needsAddress ? uuid(undefined) : null,
    payment_method:'cod', promotion_code:body.promotion_code ? text(body.promotion_code,'Mã',40).toUpperCase() : null,
    note:body.note === undefined || body.note === '' ? null : text(body.note,'Ghi chú',2000)};
}
function quoteSignature(secret, data) { return createHmac('sha256',secret).update(data).digest('base64url'); }
export function createQuote(secret, userId, snapshot, now = Date.now()) {
  const data = Buffer.from(JSON.stringify({userId, hash:fingerprint(snapshot), expires:now+300000})).toString('base64url');
  return `${data}.${quoteSignature(secret,data)}`;
}
export function verifyQuote(secret, token, userId, snapshot, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) throw conflict('Vui lòng xem lại giá trước khi đặt đơn');
  const [data, sig, extra] = token.split('.');
  const expected = quoteSignature(secret,data || '');
  if (extra || !sig || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig),Buffer.from(expected))) throw conflict('Báo giá không hợp lệ');
  let payload;
  try { payload = JSON.parse(Buffer.from(data,'base64url')); } catch { throw invalid('Báo giá không hợp lệ'); }
  if (payload.userId !== userId || payload.hash !== fingerprint(snapshot) || payload.expires <= now) throw new ApiError(409,'PRICE_CHANGED','Giá, giỏ hàng hoặc báo giá đã thay đổi. Vui lòng xem lại và xác nhận.');
}
async function calculation(client, userId, input, lock) {
  const products = await cartRows(client,userId,lock);
  if (!products.length) throw conflict('Giỏ hàng trống');
  const promotion = await getPromotion(client,input.promotion_code,lock);
  const now = (await client.query('SELECT clock_timestamp() AS now')).rows[0].now;
  let subtotal = 0n;
  const items = products.map(p => {
    if (p.status !== 'active' || p.quantity > p.stock_quantity) throw conflict('Sản phẩm không bán hoặc không đủ tồn kho');
    const unit_price_vnd = currentPrice(p,now), line_total_vnd = money(BigInt(unit_price_vnd)*BigInt(p.quantity));
    subtotal += BigInt(line_total_vnd);
    return {product_id:p.id, seller_id:p.seller_id, product_name:p.name, product_image_url:p.image_url,
      unit_price_vnd, quantity:p.quantity, line_total_vnd};
  });
  const discount_vnd = discountFor(promotion,subtotal,new Date(now));
  const totals = {subtotal_vnd:money(subtotal),discount_vnd,shipping_fee_vnd:30000,total_vnd:money(subtotal-BigInt(discount_vnd)+30000n)};
  return {items,promotion,totals, snapshot:{address_id:input.address_id,promotion_code:input.promotion_code,
    items:items.map(i => [i.product_id,i.quantity,i.unit_price_vnd]),...totals}};
}
async function addressFor(client,userId,id) {
  const address = (await client.query('SELECT * FROM addresses WHERE id=$1 AND user_id=$2 FOR SHARE',[id,userId])).rows[0];
  if (!address) throw missing();
  return address;
}
export async function preview(pool,secret,userId,body) {
  const input = checkoutInput(body,false);
  return transaction(pool,async client => {
    await lockCart(client,userId);
    if (input.address_id) await addressFor(client,userId,input.address_id);
    const {totals,snapshot} = await calculation(client,userId,input,true);
    return {...totals,promotion_code:input.promotion_code,promotion_discount_vnd:totals.discount_vnd,
      promotion_valid:Boolean(input.promotion_code),checkout_quote:createQuote(secret,userId,snapshot)};
  });
}
export async function orderDetail(client,id,userId) {
  const row = (await client.query(`SELECT o.*,p.code AS promotion_code FROM orders o
    LEFT JOIN promotions p ON p.id=o.promotion_id WHERE o.id=$1 ${userId ? 'AND o.user_id=$2' : ''}`,userId ? [id,userId] : [id])).rows[0];
  if (!row) throw missing();
  const items = (await client.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id',[id])).rows.map(monetary);
  const shipment = (await client.query('SELECT carrier,tracking_number,shipped_at,delivered_at FROM shipments WHERE order_id=$1',[id])).rows[0] || null;
  const {idempotency_key,request_fingerprint,...safe} = row;
  return {...monetary(safe),items,shipment};
}
export async function createOrder(pool,secret,userId,body,key) {
  key = text(key,'Idempotency-Key',100);
  const input = checkoutInput(body), requestHash = fingerprint(input);
  return transaction(pool,async client => {
    await lockCart(client,userId);
    // Retry must precede reading the cart, address or quote: these may have changed after success.
    const old = (await client.query('SELECT id,request_fingerprint FROM orders WHERE user_id=$1 AND idempotency_key=$2',[userId,key])).rows[0];
    if (old) {
      if (old.request_fingerprint !== requestHash) throw conflict('Idempotency-Key đã dùng cho nội dung khác');
      return orderDetail(client,old.id,userId);
    }
    const address = await addressFor(client,userId,input.address_id);
    const {items,promotion,totals,snapshot} = await calculation(client,userId,input,true);
    verifyQuote(secret,body.checkout_quote,userId,snapshot);
    const id = randomUUID(), order_number = `VC-${id.replaceAll('-','').slice(0,24)}`;
    await client.query(`INSERT INTO orders(id,order_number,user_id,recipient_name,phone,shipping_address,note,
      payment_method,subtotal_vnd,discount_vnd,shipping_fee_vnd,total_vnd,promotion_id,idempotency_key,request_fingerprint)
      VALUES($1,$2,$3,$4,$5,$6,$7,'cod',$8,$9,$10,$11,$12,$13,$14)`,
    [id,order_number,userId,address.recipient_name,address.phone,
      [address.address_line,address.ward,address.district,address.province].filter(Boolean).join(', '),input.note,
      totals.subtotal_vnd,totals.discount_vnd,totals.shipping_fee_vnd,totals.total_vnd,promotion?.id || null,key,requestHash]);
    for (const item of items) {
      await client.query(`INSERT INTO order_items(order_id,product_id,seller_id,product_name,product_image_url,unit_price_vnd,quantity,line_total_vnd)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,item.product_id,item.seller_id,item.product_name,item.product_image_url,item.unit_price_vnd,item.quantity,item.line_total_vnd]);
      const changed = await client.query('UPDATE products SET stock_quantity=stock_quantity-$2,updated_at=now() WHERE id=$1 AND stock_quantity >= $2',[item.product_id,item.quantity]);
      if (changed.rowCount !== 1) throw conflict('Không đủ tồn kho');
    }
    if (promotion) await client.query('UPDATE promotions SET used_count=used_count+1 WHERE id=$1',[promotion.id]);
    await client.query('DELETE FROM cart_items WHERE user_id=$1',[userId]);
    return orderDetail(client,id,userId);
  });
}
export async function listOrders(pool,userId,query) {
  const {page,limit,offset} = pagination(query), params = [], where=[];
  if (userId) {params.push(userId);where.push(`user_id=$${params.length}`);}
  if (query.status) {
    if (!ORDER_STATUSES.includes(query.status)) throw invalid('Trạng thái không hợp lệ');
    params.push(query.status);where.push(`status=$${params.length}`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return transaction(pool,async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const total = Number((await client.query(`SELECT count(*) AS n FROM orders ${clause}`,params)).rows[0].n);
    const rows = (await client.query(`SELECT id FROM orders ${clause} ORDER BY created_at DESC,id LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,limit,offset])).rows;
    const data = [];
    for (const row of rows) data.push(await orderDetail(client,row.id,userId));
    return {data,meta:{page,limit,total}};
  });
}
async function lockedOrder(client,id,userId) {
  uuid(id);
  const order = (await client.query(`SELECT * FROM orders WHERE id=$1 ${userId ? 'AND user_id=$2' : ''} FOR UPDATE`, userId ? [id,userId] : [id])).rows[0];
  if (!order) throw missing();
  return order;
}
async function restoreStock(client,order) {
  const items = (await client.query('SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id',[order.id])).rows;
  for (const item of items) await client.query('UPDATE products SET stock_quantity=stock_quantity+$2,updated_at=now() WHERE id=$1',[item.product_id,item.quantity]);
  // Cancellation does not release a coupon use: usage_limit counts successful checkouts.
}
export async function changeStatus(pool,id,status,userId) {
  if (!ORDER_STATUSES.includes(status)) throw invalid('Trạng thái không hợp lệ');
  return transaction(pool,async client => {
    const order = await lockedOrder(client,id,userId);
    if (!transitions[order.status].includes(status)) throw conflict('Không thể chuyển trạng thái đơn hàng');
    if (status === 'shipping') {
      const s = (await client.query('SELECT * FROM shipments WHERE order_id=$1',[id])).rows[0];
      if (!s?.carrier || !s?.tracking_number) throw conflict('Cần lưu vận đơn trước khi giao hàng');
      await client.query('UPDATE shipments SET shipped_at=now() WHERE order_id=$1',[id]);
    }
    if (status === 'delivered') await client.query('UPDATE shipments SET delivered_at=now() WHERE order_id=$1',[id]);
    if (status === 'cancelled') await restoreStock(client,order);
    await client.query('UPDATE orders SET status=$2,updated_at=now() WHERE id=$1',[id,status]);
    return orderDetail(client,id,userId);
  });
}
export async function saveShipment(pool,id,body) {
  const carrier = text(body.carrier,'Đơn vị vận chuyển',80), tracking = text(body.tracking_number,'Mã vận đơn',100);
  return transaction(pool,async client => {
    const order = await lockedOrder(client,id);
    if (['delivered','cancelled'].includes(order.status)) throw conflict('Đơn đã kết thúc');
    await client.query(`INSERT INTO shipments(order_id,carrier,tracking_number) VALUES($1,$2,$3)
      ON CONFLICT(order_id) DO UPDATE SET carrier=$2,tracking_number=$3`,[id,carrier,tracking]);
    return orderDetail(client,id);
  });
}
