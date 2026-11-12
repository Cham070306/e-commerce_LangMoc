import {conflict, invalid, missing, text, money, integer} from '../../common/c4.mjs';

export async function getPromotion(client, code, lock = false) {
  if (!code) return null;
  code = text(code, 'Mã giảm giá', 40).toUpperCase();
  const {rows} = await client.query(`SELECT * FROM promotions WHERE code=$1 ${lock ? 'FOR UPDATE' : ''}`, [code]);
  if (!rows[0]) throw missing();
  return rows[0];
}
export function discountFor(promo, subtotal, now = new Date()) {
  if (!promo) return 0;
  if (!promo.is_active || now < new Date(promo.starts_at) || now >= new Date(promo.ends_at) ||
      (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) || subtotal < BigInt(promo.min_subtotal_vnd)) {
    throw conflict('Mã giảm giá hết hạn, hết lượt hoặc chưa đủ điều kiện');
  }
  let amount = promo.discount_type === 'percent' ? subtotal * BigInt(promo.discount_value) / 100n : BigInt(promo.discount_value);
  if (promo.max_discount_vnd !== null) amount = amount > BigInt(promo.max_discount_vnd) ? BigInt(promo.max_discount_vnd) : amount;
  return money(amount > subtotal ? subtotal : amount);
}
export function promotionInput(body, partial = false) {
  const out = {};
  const accept = (k, fn) => { if (Object.hasOwn(body, k)) out[k] = fn(body[k]); else if (!partial) throw invalid(`Thiếu ${k}`); };
  if (!partial) {
    accept('code', v => text(v, 'Mã', 40).toUpperCase());
    accept('discount_type', v => {if (!['fixed','percent'].includes(v)) throw invalid(); return v;});
    accept('discount_value', v => integer(v, 1, body.discount_type === 'percent' ? 100 : Number.MAX_SAFE_INTEGER));
    out.min_subtotal_vnd = body.min_subtotal_vnd === undefined ? 0 : integer(body.min_subtotal_vnd, 0, Number.MAX_SAFE_INTEGER);
    out.max_discount_vnd = body.max_discount_vnd == null ? null : integer(body.max_discount_vnd, 1, Number.MAX_SAFE_INTEGER);
  }
  for (const k of ['starts_at','ends_at']) accept(k, v => {
    if (typeof v !== 'string' || !Number.isFinite(Date.parse(v))) throw invalid('Thời gian không hợp lệ');
    return new Date(v).toISOString();
  });
  if (!partial || Object.hasOwn(body, 'usage_limit')) out.usage_limit = body.usage_limit == null ? null : integer(body.usage_limit);
  if (!partial || Object.hasOwn(body, 'is_active')) {
    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') throw invalid();
    out.is_active = body.is_active ?? true;
  }
  if (out.starts_at && out.ends_at && out.starts_at >= out.ends_at) throw invalid('Thời hạn mã không hợp lệ');
  if (!Object.keys(out).length) throw invalid('Không có trường cập nhật');
  return out;
}
