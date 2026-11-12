import {ApiError, invalid, missing, requireUser, requireAdmin, uuid, transaction} from './common/c4.mjs';
import {getCart,putCart,deleteCart} from './modules/cart/service.mjs';
import {preview,createOrder,orderDetail,listOrders,changeStatus,saveShipment} from './modules/orders/service.mjs';
import {createReview,publicReviews} from './modules/reviews/service.mjs';
import {createContact} from './modules/contact/service.mjs';
import {listAdmin,moderate,writePromotion} from './modules/admin/service.mjs';
const PRODUCT_UUID='([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})';

async function jsonBody(req) {
  if (req.body !== undefined) {
    if (!req.body || Array.isArray(req.body) || typeof req.body!=='object') throw invalid();
    return req.body;
  }
  let size=0, chunks=[];
  for await (const chunk of req) {
    const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    size+=buffer.length;
    if(size>65536) throw new ApiError(413,'PAYLOAD_TOO_LARGE','Nội dung quá lớn');
    chunks.push(buffer);
  }
  if (!size) return {};
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new ApiError(415,'UNSUPPORTED_MEDIA_TYPE','Yêu cầu JSON');
  try {
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!value || Array.isArray(value) || typeof value!=='object') throw invalid();
    return value;
  } catch { throw invalid('JSON không hợp lệ'); }
}
function send(res,status,body) {
  res.statusCode=status;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (status===429) res.setHeader('Retry-After','60');
  if (status===204) return res.end();
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/** Node/Express-compatible handler. C3 must supply its verified cookie-session resolver.
 * authenticate(req) -> {id} | null. No identity or role is accepted from request headers/body.
 * Return next() for routes owned by C3. Works behind Vite's /api proxy.
 */
export function createC4Handler({pool,authenticate,quoteSecret,allowedOrigins=[],onError=()=>{}}) {
  if (!pool || typeof authenticate!=='function' || typeof quoteSecret!=='string' || quoteSecret.length<32) throw new Error('C4 requires a pool, C3 session resolver and shared secret of at least 32 characters');
  const routes=[];
  const route=(method,path,access,handler,status=200)=>routes.push({method,pattern:new RegExp(`^/api/v1${path}/?$`),access,handler,status});
  route('GET','/me/cart','user',c=>getCart(pool,c.user.id));
  route('PUT','/me/cart/items/([^/]+)','user',c=>putCart(pool,c.user.id,c.id,c.body.quantity));
  route('DELETE','/me/cart/items/([^/]+)','user',c=>deleteCart(pool,c.user.id,c.id),204);
  route('POST','/checkout/preview','user',c=>preview(pool,quoteSecret,c.user.id,c.body));
  route('POST','/orders','user',c=>createOrder(pool,quoteSecret,c.user.id,c.body,c.req.headers['idempotency-key']),201);
  route('GET','/me/orders','user',c=>listOrders(pool,c.user.id,c.query));
  route('GET','/me/orders/([^/]+)','user',c=>transaction(pool,client=>orderDetail(client,uuid(c.id),c.user.id)));
  route('POST','/me/orders/([^/]+)/cancel','user',c=>changeStatus(pool,c.id,'cancelled',c.user.id));
  route('GET',`/products/${PRODUCT_UUID}/reviews`,'public',c=>publicReviews(pool,c.id,c.query));
  route('POST',`/products/${PRODUCT_UUID}/reviews`,'user',c=>createReview(pool,c.user.id,c.id,c.body),201);
  route('POST','/contact','public',c=>createContact(pool,quoteSecret,c.user?.id,c.req.socket.remoteAddress || 'unknown',c.body),201);
  route('GET','/admin/orders','admin',c=>listOrders(pool,null,c.query));
  route('GET','/admin/orders/([^/]+)','admin',c=>transaction(pool,client=>orderDetail(client,uuid(c.id))));
  route('PATCH','/admin/orders/([^/]+)/status','admin',c=>changeStatus(pool,c.id,c.body.status));
  route('PATCH','/admin/orders/([^/]+)/shipment','admin',c=>saveShipment(pool,c.id,c.body));
  for (const kind of ['reviews','contact','promotions']) {
    route('GET',`/admin/${kind}`,'admin',c=>listAdmin(pool,kind,c.query));
    route('PATCH',`/admin/${kind}/([^/]+)`,'admin',c=>kind==='promotions'?writePromotion(pool,c.id,c.body):moderate(pool,kind,c.id,c.body));
  }
  route('POST','/admin/promotions','admin',c=>writePromotion(pool,null,c.body),201);
  return async (req,res,next) => {
    try {
      const url=new URL(req.originalUrl || req.url,'http://api.local');
      const selected=routes.find(r=>r.method===req.method && r.pattern.test(url.pathname));
      if (!selected) { if(next) return next(); throw missing(); }
      if (!['GET','HEAD'].includes(req.method) && req.headers.origin && !allowedOrigins.includes(req.headers.origin)) throw new ApiError(403,'FORBIDDEN','Origin không được phép');
      const identity=await authenticate(req);
      const user=identity ? (await pool.query('SELECT id,role FROM users WHERE id=$1 AND is_active=true',[uuid(identity.id)])).rows[0] : null;
      if(selected.access==='user') requireUser(user);
      if(selected.access==='admin') requireAdmin(user);
      const body=['POST','PUT','PATCH'].includes(req.method)?await jsonBody(req):{};
      const result=await selected.handler({req,user,body,id:url.pathname.match(selected.pattern)[1],query:Object.fromEntries(url.searchParams)});
      send(res,selected.status,result && Object.hasOwn(result,'data') ? result : {data:result});
    } catch(error) {
      if (!(error instanceof ApiError)) {
        if (['23505','23514','23503','40001','40P01','55P03'].includes(error.code)) error=new ApiError(409,'CONFLICT','Dữ liệu thay đổi hoặc trùng lặp; vui lòng thử lại');
        else {onError(error);error=new ApiError(500,'INTERNAL_ERROR','Không thể hoàn thành yêu cầu');}
      }
      send(res,error.status,{error:{code:error.code,message:error.message,...(error.fields?{fields:error.fields}:{})}});
    }
  };
}
