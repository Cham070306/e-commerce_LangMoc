import {useEffect,useRef,useState} from 'react';
import {ShoppingBag,Zap,X} from 'lucide-react';
import type {Product} from '../../lib/types';
import {formatMoney,ProductImage} from '../catalog/ProductCard';
type Item={id:string;slug:string;name:string;image:string;price:number|null;quantity:number;price_is_demo?:boolean};
const key='langmoc.cart.v1';
function readCart():Item[]{try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&(x.price===null||typeof x.price==='number')):[]}catch{return []}}
export default function ProductPurchase({product:p}:{product:Product}){
 const [items,setItems]=useState<Item[]>(readCart),[notice,setNotice]=useState(''),[mode,setMode]=useState<'cart'|'buy'|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
 const item:Item={id:p.id,slug:p.slug,name:p.name,image:p.images[0]?.url||'',price:p.current_price_vnd,quantity:1,price_is_demo:p.price_is_demo};
 useEffect(()=>{if(mode)dialog.current?.showModal();else dialog.current?.close()},[mode]);
 function save(next:Item[]){try{localStorage.setItem(key,JSON.stringify(next));setItems(next);return true}catch{setNotice('Chưa lưu được giỏ hàng trên trình duyệt này. Vui lòng thử lại.');return false}}
 function add(){const current=readCart(),found=current.find(x=>x.id===p.id);const next=found?current.map(x=>x.id===p.id?{...item,quantity:x.quantity+1}:x):[...current,item];if(save(next))setNotice('Đã thêm 1 sản phẩm vào giỏ hàng.')}
 function open(nextMode:'cart'|'buy',trigger:HTMLButtonElement){lastTrigger.current=trigger;setItems(readCart());setMode(nextMode)}
 function close(){setMode(null);lastTrigger.current?.focus()}
 const shown=mode==='buy'?[item]:items,total=shown.reduce((sum,x)=>sum+(x.price||0)*x.quantity,0);
 return <div className="purchase-area"><div className="purchase-actions"><button className="button add-cart" onClick={add}><ShoppingBag size={18}/>Thêm vào giỏ hàng</button><button className="button buy-now" onClick={e=>open('buy',e.currentTarget)}><Zap size={18}/>Mua ngay</button></div><p className="purchase-status" role="status">{notice}</p><button className="cart-preview-link" onClick={e=>open('cart',e.currentTarget)}>Xem giỏ hàng ({items.reduce((sum,x)=>sum+x.quantity,0)})</button><dialog ref={dialog} className="purchase-dialog" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}} aria-labelledby="purchase-title"><button className="icon-button purchase-close" aria-label="Đóng giỏ hàng" onClick={close}><X/></button><h2 id="purchase-title">{mode==='buy'?'Xem trước đơn hàng':'Giỏ hàng của bạn'}</h2><p className="data-note">Bản demo · Chưa kết nối đặt hàng và thanh toán.</p>{shown.length?<><div className="purchase-items">{shown.map(x=><article key={x.id}><ProductImage src={x.image} alt={x.name}/><div><a href={'#/product/'+x.slug} onClick={close}>{x.name}</a><p>{x.price===null?'Chưa có giá':formatMoney(x.price)} × {x.quantity}</p>{x.price_is_demo&&<small>Giá demo · chưa xác minh</small>}{mode==='cart'&&<button onClick={()=>save(items.filter(i=>i.id!==x.id))}>Xóa sản phẩm</button>}</div></article>)}</div><div className="purchase-total"><span>Tạm tính</span><strong>{formatMoney(total)}</strong></div><p className="data-note">Chưa gồm phí vận chuyển. Chức năng xác nhận đơn sẽ được kết nối khi backend sẵn sàng.</p></>:<p className="purchase-empty">Giỏ hàng chưa có sản phẩm.</p>}<button className="button" onClick={close}>Tiếp tục khám phá</button></dialog></div>;
}
