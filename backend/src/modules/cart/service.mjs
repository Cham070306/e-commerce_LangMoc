import {conflict, uuid, integer, money, transaction, lockCart} from '../../common/c4.mjs';

export function currentPrice(product, now = new Date()) {
  const sale = product.sale_price_vnd !== null && product.sale_price_vnd !== undefined &&
    (!product.sale_starts_at || now >= new Date(product.sale_starts_at)) &&
    (!product.sale_ends_at || now < new Date(product.sale_ends_at));
  return money(sale ? product.sale_price_vnd : product.price_vnd);
}
export async function cartRows(client, userId, lock = false) {
  return (await client.query(`SELECT p.*, c.quantity,
    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order,id LIMIT 1) AS image_url
    FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=$1
    ORDER BY p.id ${lock ? 'FOR UPDATE OF p' : ''}`, [userId])).rows;
}
export function cartItem(p, now) {
  return {product_id:p.id, product_slug:p.slug, product_name:p.name, image_url:p.image_url || '',
    price_vnd:currentPrice(p, now), quantity:p.quantity, stock_quantity:p.stock_quantity, origin:p.origin_province};
}
export async function getCart(pool, userId) {
  const items = (await cartRows(pool, userId)).map(p => cartItem(p));
  return {items, subtotal_vnd:money(items.reduce((s,i) => s + BigInt(i.price_vnd) * BigInt(i.quantity), 0n))};
}
export async function putCart(pool, userId, productId, quantity) {
  uuid(productId); integer(quantity);
  return transaction(pool, async client => {
    await lockCart(client, userId);
    const p = (await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [productId])).rows[0];
    if (!p || p.status !== 'active' || p.stock_quantity < quantity) throw conflict('Sản phẩm không bán hoặc không đủ tồn kho');
    await client.query(`INSERT INTO cart_items(user_id,product_id,quantity) VALUES($1,$2,$3)
      ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=$3,updated_at=now()`, [userId,productId,quantity]);
    return cartItem((await cartRows(client, userId)).find(i => i.id === productId));
  });
}
export async function deleteCart(pool, userId, productId) {
  uuid(productId);
  return transaction(pool, async client => {
    await lockCart(client, userId);
    await client.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [userId, productId]);
  });
}
