import {createHmac} from 'node:crypto';
import {ApiError, invalid, text, transaction} from '../../common/c4.mjs';

export async function createContact(pool,secret,userId,clientAddress,body) {
  const name = text(body.name,'Họ tên',120), email = text(body.email,'Email',255),
    subject = text(body.subject,'Tiêu đề',160), message = text(body.message,'Nội dung',10000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalid('Email không hợp lệ');
  const key = createHmac('sha256',secret).update(`contact:${clientAddress}`).digest('hex');
  return transaction(pool,async client => {
    // Counter commits even if rejected: retries cannot reset a window across workers.
    await client.query('DELETE FROM c4_contact_rate_limits WHERE expires_at<=now()');
    const count = (await client.query(`INSERT INTO c4_contact_rate_limits(key_hash,expires_at,attempts)
      VALUES($1,now()+interval '1 minute',1) ON CONFLICT(key_hash) DO UPDATE SET
      attempts=CASE WHEN c4_contact_rate_limits.expires_at<=now() THEN 1 ELSE c4_contact_rate_limits.attempts+1 END,
      expires_at=CASE WHEN c4_contact_rate_limits.expires_at<=now() THEN now()+interval '1 minute' ELSE c4_contact_rate_limits.expires_at END
      RETURNING attempts`,[key])).rows[0].attempts;
    if (count > 5) return null;
    return (await client.query('INSERT INTO contact_messages(user_id,name,email,subject,message) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [userId || null,name,email,subject,message])).rows[0];
  }).then(row => {
    if (!row) throw new ApiError(429,'RATE_LIMITED','Vui lòng thử lại sau một phút');
    return row;
  });
}
