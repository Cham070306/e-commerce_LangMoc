import {integer, text, uuid, missing, conflict, pagination, transaction} from '../../common/c4.mjs';

export async function createReview(pool,userId,productId,body) {
  uuid(productId); const rating = integer(body.rating,1,5);
  const comment = text(body.comment,'Đánh giá',5000);
  return transaction(pool,async client => {
    const product = (await client.query("SELECT id FROM products WHERE id=$1 AND status='active' FOR SHARE",[productId])).rows[0];
    if (!product) throw missing();
    // MVP matches C2: any authenticated customer can submit, pending admin moderation.
    const result = await client.query(`INSERT INTO reviews(user_id,product_id,rating,comment) VALUES($1,$2,$3,$4)
      ON CONFLICT(product_id,user_id) DO NOTHING RETURNING *`,[userId,productId,rating,comment]);
    if (!result.rows[0]) throw conflict('Bạn đã đánh giá sản phẩm này');
    return result.rows[0];
  });
}
export async function publicReviews(pool,productId,query) {
  uuid(productId); const {page,limit,offset} = pagination(query);
  return transaction(pool,async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    if (!(await client.query("SELECT id FROM products WHERE id=$1 AND status='active'",[productId])).rows[0]) throw missing();
    const summary = (await client.query("SELECT count(*)::integer AS review_count,avg(rating)::float AS average_rating FROM reviews WHERE product_id=$1 AND status='visible'",[productId])).rows[0];
    const data = (await client.query(`SELECT r.id,r.rating,u.full_name AS author_name,r.comment AS body,r.created_at,r.status,false AS is_demo
      FROM reviews r JOIN users u ON u.id=r.user_id WHERE product_id=$1 AND r.status='visible'
      ORDER BY r.created_at DESC,r.id LIMIT $2 OFFSET $3`,[productId,limit,offset])).rows;
    return {data,meta:{page,limit,total:summary.review_count},summary};
  });
}
