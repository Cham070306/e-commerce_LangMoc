// A fresh, disposable real PostgreSQL cluster. No developer database is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {Pool} from 'pg';
import {temporaryPostgres} from './temporary-postgres.mjs';
import {createC4Handler} from '../src/c4.mjs';
import {putCart,getCart} from '../src/modules/cart/service.mjs';
import {preview,createOrder,changeStatus,saveShipment,orderDetail} from '../src/modules/orders/service.mjs';
import {createContact} from '../src/modules/contact/service.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
test('C4 against isolated PostgreSQL (including parallel connections)',{timeout:180000},async t=>{
  // OS-assigned free loopback port. Tests never connect to a configured production DB.
  const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
  const port=probe.address().port;await new Promise(r=>probe.close(r));
  const password=randomBytes(24).toString('hex');
  let pool,server,pg;
  try {
    pg=await temporaryPostgres({port,password});
    pool=new Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',max:12});
    const version=(await pool.query('SELECT version() AS version')).rows[0].version;
    t.diagnostic(version);
    for (const migration of [
      '001_initial.sql',
      '002_auth_catalog.sql',
      '003_product_image_unique.sql',
      '004_catalog_content.sql',
      '005_guest_orders.sql',
      '006_c4_transactions.sql',
    ]) {
      await pool.query(await readFile(join(root,`database/${migration}`),'utf8'));
    }
    const secret=randomBytes(32).toString('hex');
    const u=randomUUID(),other=randomUUID(),admin=randomUUID(),inactive=randomUUID(),category=randomUUID();
    for(const [id,role,active] of [[u,'customer',true],[other,'customer',true],[admin,'admin',true],[inactive,'admin',false]])
      await pool.query('INSERT INTO users(id,full_name,email,password_hash,role,is_active) VALUES($1,$2,$3,$4,$5,$6)',[id,'Test user',`${id}@example.invalid`,'test-only-not-a-login-hash',role,active]);
    await pool.query("INSERT INTO categories(id,name,slug) VALUES($1,'Test','test')",[category]);
    const addresses=new Map();
    for(const id of [u,other]) {
      const a=randomUUID();addresses.set(id,a);
      await pool.query(`INSERT INTO addresses(id,user_id,recipient_name,phone,province,district,ward,address_line)
        VALUES($1,$2,'Test','0901234567','Test province','Test district','Test ward','Test street')`,[a,id]);
    }
    const product=async(stock=5,price=100000)=>{
      const id=randomUUID();await pool.query(`INSERT INTO products(id,category_id,name,slug,price_vnd,stock_quantity,status)
        VALUES($1,$2,'Original product',$5,$3,$4,'active')`,[id,category,price,stock,id]);return id;
    };
    const clearCart=id=>pool.query('DELETE FROM cart_items WHERE user_id=$1',[id]);
    const payload=id=>({address_id:addresses.get(id),payment_method:'cod'});
    const quoted=async(id,extra={})=>({...payload(id),...extra,checkout_quote:(await preview(pool,secret,id,{...payload(id),...extra})).checkout_quote});
    const stock=async id=>(await pool.query('SELECT stock_quantity FROM products WHERE id=$1',[id])).rows[0].stock_quantity;
    let firstOrder;

    await t.test('server reprices; identical concurrent retries create one order and decrement once',async()=>{
      const p=await product(5);await putCart(pool,u,p,2);
      const b=await quoted(u);b.total_vnd=1;b.payment_status='paid';
      const key=randomUUID(),results=await Promise.all(Array.from({length:8},()=>createOrder(pool,secret,u,b,key)));
      firstOrder=results[0];assert.equal(new Set(results.map(o=>o.id)).size,1);
      assert.equal(firstOrder.total_vnd,230000);assert.equal(firstOrder.payment_status,'unpaid');
      assert.equal(await stock(p),3);assert.equal((await getCart(pool,u)).items.length,0);
      assert.equal((await createOrder(pool,secret,u,{...b,checkout_quote:undefined},key)).id,firstOrder.id);
      await assert.rejects(createOrder(pool,secret,u,{...b,note:'different'},key),{status:409});
      await pool.query("UPDATE products SET name='Changed',price_vnd=999999 WHERE id=$1",[p]);
      assert.equal((await orderDetail(pool,firstOrder.id,u)).items[0].unit_price_vnd,100000);
      assert.equal((await orderDetail(pool,firstOrder.id,u)).items[0].product_name,'Original product');
    });
    await t.test('ownership and pending cancellation restore stock only once',async()=>{
      await assert.rejects(orderDetail(pool,firstOrder.id,other),{status:404});
      await assert.rejects(changeStatus(pool,firstOrder.id,'cancelled',other),{status:404});
      const p=firstOrder.items[0].product_id;
      const results=await Promise.allSettled([changeStatus(pool,firstOrder.id,'cancelled',u),changeStatus(pool,firstOrder.id,'cancelled',u)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await stock(p),5);
    });
    await t.test('two customers compete for the final item without overselling',async()=>{
      const p=await product(1);await putCart(pool,u,p,1);await putCart(pool,other,p,1);
      const [a,b]=await Promise.all([quoted(u),quoted(other)]);
      const results=await Promise.allSettled([createOrder(pool,secret,u,a,randomUUID()),createOrder(pool,secret,other,b,randomUUID())]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal(results.find(r=>r.status==='rejected').reason.status,409);assert.equal(await stock(p),0);
      await clearCart(u);await clearCart(other);
    });
    await t.test('price changes, missing quote, foreign address and bad quantity are rejected',async()=>{
      const p=await product(3);await putCart(pool,u,p,1);const b=await quoted(u);
      await pool.query('UPDATE products SET price_vnd=200000 WHERE id=$1',[p]);
      await assert.rejects(createOrder(pool,secret,u,b,randomUUID()),{code:'PRICE_CHANGED'});
      await assert.rejects(createOrder(pool,secret,u,payload(u),randomUUID()),{status:409});
      await assert.rejects(preview(pool,secret,u,payload(other)),{status:404});
      for(const q of [0,-1,1.5,'1',4]) await assert.rejects(putCart(pool,u,p,q));
      assert.equal(await stock(p),3);assert.equal((await getCart(pool,u)).items[0].quantity,1);
      await clearCart(u);
    });
    await t.test('single-use promotion is locked across customers; expired promotion has no effects',async()=>{
      const code=`ONCE${randomUUID().slice(0,8)}`.toUpperCase(), p=await product(10);
      await pool.query(`INSERT INTO promotions(code,discount_type,discount_value,usage_limit,starts_at,ends_at)
        VALUES($1,'percent',10,1,now()-interval '1 day',now()+interval '1 day')`,[code]);
      for(const id of [u,other]) await putCart(pool,id,p,1);
      const [a,b]=await Promise.all([quoted(u,{promotion_code:code}),quoted(other,{promotion_code:code})]);
      const results=await Promise.allSettled([createOrder(pool,secret,u,a,randomUUID()),createOrder(pool,secret,other,b,randomUUID())]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await stock(p),9);
      assert.equal((await pool.query('SELECT used_count FROM promotions WHERE code=$1',[code])).rows[0].used_count,1);
      for(const id of [u,other]) await clearCart(id);
      await pool.query("UPDATE promotions SET starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' WHERE code=$1",[code]);
      await putCart(pool,u,p,1);
      await assert.rejects(preview(pool,secret,u,{...payload(u),promotion_code:code}),{status:409});
      assert.equal(await stock(p),9);await clearCart(u);
    });
    await t.test('database failure rolls back order, stock, coupon and cart mutations',async()=>{
      await clearCart(u);
      await pool.query(`INSERT INTO promotions(code,discount_type,discount_value,usage_limit,starts_at,ends_at)
        VALUES('ROLLBACK','fixed',5000,1,now()-interval '1 day',now()+interval '1 day')`);
      const p=await product();await putCart(pool,u,p,1);const b=await quoted(u,{promotion_code:'ROLLBACK'});const key=randomUUID();
      await pool.query(`CREATE FUNCTION c4_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;
        CREATE TRIGGER c4_test_fail BEFORE DELETE ON cart_items FOR EACH ROW EXECUTE FUNCTION c4_test_fail()`);
      try {await assert.rejects(createOrder(pool,secret,u,b,key));}
      finally {await pool.query('DROP TRIGGER c4_test_fail ON cart_items; DROP FUNCTION c4_test_fail()');}
      assert.equal(await stock(p),5);assert.equal((await getCart(pool,u)).items.length,1);
      assert.equal((await pool.query('SELECT id FROM orders WHERE idempotency_key=$1',[key])).rowCount,0);
      assert.equal((await pool.query("SELECT used_count FROM promotions WHERE code='ROLLBACK'")).rows[0].used_count,0);
      await createOrder(pool,secret,u,b,key);
    });
    await t.test('shipment and status transitions keep COD payment independent',async()=>{
      const p=await product();await putCart(pool,u,p,1);const o=await createOrder(pool,secret,u,await quoted(u),randomUUID());
      await assert.rejects(changeStatus(pool,o.id,'shipping'),{status:409});
      await changeStatus(pool,o.id,'confirmed');await assert.rejects(changeStatus(pool,o.id,'cancelled',u),{status:409});
      await changeStatus(pool,o.id,'packing');await assert.rejects(changeStatus(pool,o.id,'shipping'),{status:409});
      await assert.rejects(saveShipment(pool,o.id,{carrier:'a'.repeat(81),tracking_number:'x'}),{status:400});
      await saveShipment(pool,o.id,{carrier:'Test carrier',tracking_number:'TEST123'});
      await changeStatus(pool,o.id,'shipping');const delivered=await changeStatus(pool,o.id,'delivered');
      assert.ok(delivered.shipment.shipped_at);assert.ok(delivered.shipment.delivered_at);assert.equal(delivered.payment_status,'unpaid');
      await assert.rejects(changeStatus(pool,o.id,'pending'),{status:409});
    });

    // Test-only identity resolver; never exported by runtime code or enabled in deployment.
    const sessions=new Map([['customer',u],['other',other],['admin',admin],['inactive',inactive]]);
    const errors=[];
    server=createServer(createC4Handler({pool,quoteSecret:secret,allowedOrigins:['http://127.0.0.1:5173'],onError:e=>errors.push(e),
      authenticate:async req=>{const id=sessions.get(req.headers.cookie?.replace('test_session=',''));return id?{id}:null;}}));
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}/api/v1`;
    const call=async(path,{method='GET',session,body,headers={}}={})=>{
      const res=await fetch(base+path,{method,headers:{...(session?{cookie:`test_session=${session}`} : {}),...(body!==undefined?{'content-type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
      return {status:res.status,body:res.status===204?null:await res.json()};
    };
    await t.test('HTTP cart, preview, order retry and deletion use the same live contract',async()=>{
      const p=await product(2);
      const item=await call(`/me/cart/items/${p}`,{session:'customer',method:'PUT',body:{quantity:1}});
      assert.equal(item.status,200);assert.equal(item.body.data.product_id,p);
      const quote=await call('/checkout/preview',{session:'customer',method:'POST',body:payload(u)});
      assert.equal(quote.status,200);assert.equal(typeof quote.body.data.checkout_quote,'string');
      const body={...payload(u),checkout_quote:quote.body.data.checkout_quote},headers={'Idempotency-Key':randomUUID()};
      assert.equal((await call('/orders',{session:'customer',method:'POST',body})).status,400);
      const created=await call('/orders',{session:'customer',method:'POST',body,headers});assert.equal(created.status,201);
      const retried=await call('/orders',{session:'customer',method:'POST',body,headers});
      assert.equal(retried.body.data.id,created.body.data.id);assert.equal(await stock(p),1);
      assert.equal(Object.hasOwn(created.body.data,'request_fingerprint'),false);
      assert.equal((await call(`/me/orders/${created.body.data.id}/cancel`,{session:'customer',method:'POST',body:{}})).status,200);
      assert.equal(await stock(p),2);
      await call(`/me/cart/items/${p}`,{session:'customer',method:'PUT',body:{quantity:1}});
      assert.equal((await call(`/me/cart/items/${p}`,{session:'customer',method:'DELETE'})).status,204);
      assert.equal((await call('/me/cart',{session:'customer'})).body.data.items.length,0);
    });
    await t.test('HTTP 401/403, Origin, malformed input, inactive user and admin lists',async()=>{
      assert.equal((await call('/me/cart')).status,401);
      assert.equal((await call('/admin/orders',{session:'customer'})).status,403);
      assert.equal((await call('/admin/orders',{session:'inactive'})).status,401);
      assert.equal((await call(`/me/orders/${firstOrder.id}`,{session:'other'})).status,404);
      assert.equal((await call('/orders',{session:'customer',method:'POST',body:[],headers:{origin:'https://evil.invalid'}})).status,403);
      assert.equal((await call('/checkout/preview',{session:'customer',method:'POST',body:[]})).status,400);
      assert.equal((await call('/admin/orders?status=unknown',{session:'admin'})).status,400);
      assert.equal((await call('/me/orders?limit=101',{session:'customer'})).status,400);
      assert.equal((await call('/admin/orders',{session:'admin'})).status,200);
      assert.equal((await call('/admin/orders/'+firstOrder.id,{session:'admin'})).status,200);
      const spoof=await call('/me/cart',{headers:{'x-user-id':u,'x-role':'admin'}});assert.equal(spoof.status,401);
    });
    await t.test('reviews require auth, deduplicate, moderate and expose only visible plain text',async()=>{
      const p=await product(), path=`/products/${p}/reviews`, comment='<script>alert(1)</script>';
      assert.equal((await call(path,{method:'POST',body:{rating:5,comment}})).status,401);
      const created=await call(path,{method:'POST',session:'customer',body:{rating:5,comment}});
      assert.equal(created.status,201);assert.equal(created.body.data.status,'pending');
      assert.equal((await call(path)).body.meta.total,0);
      assert.equal((await call(path,{method:'POST',session:'customer',body:{rating:5,comment}})).status,409);
      assert.equal((await call(`/admin/reviews/${created.body.data.id}`,{method:'PATCH',session:'customer',body:{status:'visible'}})).status,403);
      assert.equal((await call(`/admin/reviews/${created.body.data.id}`,{method:'PATCH',session:'admin',body:{status:'visible'}})).status,200);
      const visible=await call(path);assert.equal(visible.body.data[0].body,comment);assert.equal(visible.body.summary.average_rating,5);
      await call(`/admin/reviews/${created.body.data.id}`,{method:'PATCH',session:'admin',body:{status:'hidden'}});
      assert.equal((await call(path)).body.meta.total,0);
    });
    await t.test('contact validates, throttles across handlers and stays admin-only',async()=>{
      const body={name:'Test',email:'test@example.invalid',subject:'Test',message:'<b>Plain text</b>'};
      assert.equal((await call('/contact',{method:'POST',body:{...body,email:'bad'}})).status,400);
      const contact=await call('/contact',{method:'POST',body});assert.equal(contact.status,201);
      assert.equal((await call('/admin/contact')).status,401);
      assert.equal((await call('/admin/contact',{session:'admin'})).body.meta.total,1);
      assert.equal((await call(`/admin/contact/${contact.body.data.id}`,{method:'PATCH',session:'admin',body:{status:'resolved'}})).status,200);
      for(let i=0;i<4;i++) assert.equal((await call('/contact',{method:'POST',body})).status,201);
      assert.equal((await call('/contact',{method:'POST',body})).status,429);
      await assert.rejects(createContact(pool,secret,null,'127.0.0.1',body),{status:429});
    });
    await t.test('admin promotion write/list validation and error envelope',async()=>{
      const body={code:'ADMIN10',discount_type:'percent',discount_value:10,starts_at:new Date(Date.now()-86400000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()};
      assert.equal((await call('/admin/promotions',{method:'POST',session:'customer',body})).status,403);
      const created=await call('/admin/promotions',{method:'POST',session:'admin',body});assert.equal(created.status,201);
      assert.equal(typeof created.body.data.discount_value,'number');
      assert.equal((await call('/admin/promotions',{session:'admin'})).status,200);
      assert.equal((await call(`/admin/promotions/${created.body.data.id}`,{method:'PATCH',session:'admin',body:{is_active:false}})).status,200);
      const duplicate=await call('/admin/promotions',{method:'POST',session:'admin',body});assert.equal(duplicate.status,409);
      assert.equal(duplicate.body.error.code,'CONFLICT');assert.equal(JSON.stringify(duplicate.body).includes('stack'),false);
    });
    assert.deepEqual(errors,[],'No unexpected internal HTTP errors');
  } finally {
    if(server) {server.closeAllConnections();await new Promise(r=>server.close(r));}
    if(pool) await pool.end();
    if(pg) await pg.stop();
  }
});
