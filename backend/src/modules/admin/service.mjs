import {invalid, missing, conflict, uuid, pagination, monetary, money, transaction} from '../../common/c4.mjs';
import {promotionInput} from '../promotions/service.mjs';
const models = {
  reviews:{table:'reviews',statuses:['pending','visible','hidden'],editable:['visible','hidden']},
  contact:{table:'contact_messages',statuses:['new','read','resolved'],editable:['read','resolved']},
  promotions:{table:'promotions'}
};
export async function listAdmin(pool,kind,query) {
  const model=models[kind], {page,limit,offset}=pagination(query);
  if (!model || (query.status && !model.statuses?.includes(query.status))) throw invalid();
  const filter=query.status ? 'WHERE status=$1' : '', params=query.status ? [query.status] : [];
  return transaction(pool,async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const total=Number((await client.query(`SELECT count(*) AS n FROM ${model.table} ${filter}`,params)).rows[0].n);
    const data=(await client.query(`SELECT * FROM ${model.table} ${filter} ORDER BY ${kind==='promotions'?'starts_at':'created_at'} DESC,id
      LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,limit,offset])).rows.map(monetary);
    // PostgreSQL bigint values must stay JSON numbers within the supported safe range.
    if (kind==='promotions') for (const row of data) row.discount_value=money(row.discount_value);
    return {data,meta:{page,limit,total}};
  });
}
export async function moderate(pool,kind,id,body) {
  uuid(id); const model=models[kind];
  if (!model?.editable?.includes(body.status)) throw invalid('Trạng thái kiểm duyệt không hợp lệ');
  const row=(await pool.query(`UPDATE ${model.table} SET status=$2 WHERE id=$1 RETURNING *`,[id,body.status])).rows[0];
  if (!row) throw missing();
  return row;
}
export async function writePromotion(pool,id,body) {
  if (id) uuid(id);
  const input=promotionInput(body,Boolean(id));
  return transaction(pool,async client => {
    if (id) {
      const old=(await client.query('SELECT * FROM promotions WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!old) throw missing();
      const merged={...old,...input};
      if (new Date(merged.starts_at)>=new Date(merged.ends_at)) throw invalid('Thời hạn mã không hợp lệ');
      if (merged.usage_limit!==null && merged.usage_limit<old.used_count) throw conflict('Giới hạn thấp hơn số lượt đã dùng');
    }
    const keys=Object.keys(input),values=Object.values(input);
    const row=(await client.query(id
      ? `UPDATE promotions SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE id=$${keys.length+1} RETURNING *`
      : `INSERT INTO promotions(${keys.join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`,id?[...values,id]:values)).rows[0];
    return {...monetary(row),discount_value:money(row.discount_value)};
  });
}
