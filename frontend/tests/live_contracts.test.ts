import test from 'node:test';
import assert from 'node:assert/strict';
import {fromLiveAddress,toLiveAddress,addressFieldErrors} from '../src/lib/liveContracts.ts';

test('địa chỉ live giữ đủ tên và đường để Account/Checkout sử dụng',()=>{
  const payload={full_name:'Người nhận',phone:'0901234567',province:'TP.HCM',district:'Tân Bình',ward:'Tân Bình',street_address:'57 Bàu Cát 6',is_default:true};
  const wire=toLiveAddress(payload);
  assert.equal(wire.recipient_name,payload.full_name);
  assert.equal(wire.address_line,payload.street_address);
  assert.equal('full_name' in wire,false);
  assert.deepEqual(fromLiveAddress({id:'address-id',...wire}),{id:'address-id',...payload});
  assert.deepEqual(addressFieldErrors({recipient_name:'Tên sai',address_line:'Đường sai',phone:'SĐT sai'}),
    {full_name:'Tên sai',street_address:'Đường sai',phone:'SĐT sai'});
});
