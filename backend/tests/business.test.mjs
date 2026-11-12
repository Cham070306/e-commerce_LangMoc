import test from 'node:test';
import assert from 'node:assert/strict';
import {currentPrice} from '../src/modules/cart/service.mjs';
import {discountFor} from '../src/modules/promotions/service.mjs';
import {createQuote,verifyQuote} from '../src/modules/orders/service.mjs';
import {money,pagination} from '../src/common/c4.mjs';
const now=new Date('2026-11-11T00:00:00Z');
test('sale window is start-inclusive and end-exclusive',()=>{
  const product={price_vnd:'200000',sale_price_vnd:'150000',sale_starts_at:now,sale_ends_at:'2026-11-12T00:00:00Z'};
  assert.equal(currentPrice(product,now),150000);
  assert.equal(currentPrice(product,new Date('2026-11-12T00:00:00Z')),200000);
  assert.equal(currentPrice({...product,sale_starts_at:'2026-11-13T00:00:00Z'},now),200000);
});
test('integer discounts floor VND, cap and reject expired/exhausted codes',()=>{
  const promo={is_active:true,starts_at:'2026-11-10',ends_at:'2026-11-12',usage_limit:1,used_count:0,
    min_subtotal_vnd:'0',discount_type:'percent',discount_value:'10',max_discount_vnd:null};
  assert.equal(discountFor(promo,100009n,now),10000);
  assert.equal(discountFor({...promo,max_discount_vnd:'5000'},100009n,now),5000);
  assert.equal(discountFor({...promo,discount_type:'fixed',discount_value:'999999'},1n,now),1);
  assert.throws(()=>discountFor({...promo,used_count:1},100000n,now),{status:409});
  assert.throws(()=>discountFor({...promo,ends_at:now},100000n,now),{status:409});
});
test('quote binds user, contents, expiry and secret',()=>{
  const secret='x'.repeat(32), snapshot={items:[['p',1,150000]],total_vnd:180000};
  const token=createQuote(secret,'u',snapshot,0);
  assert.doesNotThrow(()=>verifyQuote(secret,token,'u',snapshot,1));
  for(const args of [[secret,token,'other',snapshot,1],[secret,token,'u',{...snapshot,total_vnd:180001},1],
    [secret,token,'u',snapshot,300000],['y'.repeat(32),token,'u',snapshot,1],[secret,token+'.extra','u',snapshot,1]]) {
    assert.throws(()=>verifyQuote(...args),{status:409});
  }
});
test('unsafe monetary values and pagination injection are rejected',()=>{
  assert.throws(()=>money(9007199254740992n),{status:400});
  for(const value of ['1; DROP TABLE users','0','NaN','101']) assert.throws(()=>pagination({limit:value}),{status:400});
});
