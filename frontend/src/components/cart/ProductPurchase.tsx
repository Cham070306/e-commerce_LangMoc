import {useEffect,useRef,useState} from 'react';
import {ShoppingBag,Zap,X} from 'lucide-react';
import type {Product} from '../../lib/types';
import {formatMoney,ProductImage} from '../catalog/ProductCard';
import {useCart} from '../../features/cart/CartContext';
import {useAuth} from '../../features/auth/AuthContext';

type Item={id:string;slug:string;name:string;image:string;price:number|null;quantity:number;origin?:string|null;price_is_demo?:boolean};

export default function ProductPurchase({product:p}:{product:Product}){
 const {user}=useAuth();
 const {addToCart,items:contextItems,removeFromCart}=useCart();
 const [notice,setNotice]=useState(''),[mode,setMode]=useState<'cart'|'buy'|null>(null);
 const [buying,setBuying]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),lastTrigger=useRef<HTMLButtonElement|null>(null);
 const item:Item={id:p.id,slug:p.slug,name:p.name,image:p.images[0]?.url||'',price:p.current_price_vnd,quantity:1,origin:p.origin||null,price_is_demo:p.price_is_demo};

 useEffect(()=>{if(mode)dialog.current?.showModal();else dialog.current?.close()},[mode]);

 async function add(){
  if(!user){
   setNotice('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
   const currentPath=location.hash.replace(/^#/,'')||'/';
   window.location.hash=`#/login?redirect=${encodeURIComponent(currentPath)}`;
   return;
  }
  const ok=await addToCart(p,1);
  if(ok){setNotice('Đã thêm 1 sản phẩm vào giỏ hàng.')}
 }

 async function buyNow(){
  if(!user){
   // Tự động bỏ sản phẩm vào giỏ hàng tạm thời (local) để khi khách đăng nhập xong sẽ tự động gộp vào giỏ
   try{
    const raw=localStorage.getItem('langmoc.cart.v1');
    const local=raw?JSON.parse(raw):[];
    if(!local.some((x:any)=>x.id===p.id)){
     local.push({
      id:p.id,
      slug:p.slug,
      name:p.name,
      image:p.images[0]?.url||'',
      price:p.current_price_vnd,
      quantity:1,
      origin:p.origin||null,
      price_is_demo:p.price_is_demo
     });
     localStorage.setItem('langmoc.cart.v1',JSON.stringify(local));
    }
   }catch{}
   setNotice('Vui lòng đăng nhập để tiến hành mua ngay.');
   window.location.hash=`#/login?redirect=${encodeURIComponent('/checkout')}`;
   return;
  }

  setBuying(true);
  setNotice('');
  try{
   // Tự động bỏ sản phẩm vào giỏ hàng nếu chưa có
   const inCart=contextItems.some(i=>i.id===p.id);
   if(!inCart){
    const ok=await addToCart(p,1);
    if(!ok){
     setNotice('Sản phẩm tạm thời không đủ tồn kho để mua ngay.');
     setBuying(false);
     return;
    }
   }
   // Chuyển thẳng khách hàng đến trang Thanh toán (Checkout) mà không cần thao tác thêm vào giỏ thủ công
   window.location.hash='#/checkout';
  }catch{
   setNotice('Có lỗi xảy ra khi xử lý mua ngay. Vui lòng thử lại.');
   setBuying(false);
  }
 }

 function open(nextMode:'cart'|'buy',trigger:HTMLButtonElement){
  if(!user){
   setNotice('Vui lòng đăng nhập để tiếp tục.');
   const currentPath=location.hash.replace(/^#/,'')||'/';
   window.location.hash=`#/login?redirect=${encodeURIComponent(currentPath)}`;
   return;
  }
  lastTrigger.current=trigger;
  setMode(nextMode);
 }

 function close(){setMode(null);lastTrigger.current?.focus()}

 const shown=mode==='buy'?[item]:contextItems;
 const total=shown.reduce((sum,x)=>sum+(x.price||0)*x.quantity,0);
 const count=user?contextItems.reduce((s,x)=>s+x.quantity,0):0;

 return (
  <div className="purchase-area">
   <div className="purchase-actions">
    <button className="button add-cart" onClick={add}>
     <ShoppingBag size={18}/>Thêm vào giỏ hàng
    </button>
    <button className="button buy-now" onClick={buyNow} disabled={buying}>
     <Zap size={18}/>{buying?'Đang chuyển đến thanh toán…':'Mua ngay'}
    </button>
   </div>
   {!user&&<p className="data-note" style={{marginTop:'6px',fontSize:'11px'}}>💡 Đăng nhập để thêm sản phẩm vào giỏ hàng và đặt hàng.</p>}
   <p className="purchase-status" role="status">{notice}</p>
   <button className="cart-preview-link" onClick={e=>{if(!user){window.location.hash='#/login?redirect='+encodeURIComponent('/cart')}else{open('cart',e.currentTarget)}}}>
    Xem giỏ hàng ({count})
   </button>
   <dialog ref={dialog} className="purchase-dialog" onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}} aria-labelledby="purchase-title">
    <button className="icon-button purchase-close" aria-label="Đóng giỏ hàng" onClick={close}><X/></button>
    <h2 id="purchase-title">{mode==='buy'?'Xem trước đơn hàng':'Giỏ hàng của bạn'}</h2>
    <p className="data-note">Bản demo · Chưa kết nối đặt hàng và thanh toán.</p>
    {shown.length?(
     <>
      <div className="purchase-items">
       {shown.map(x=>(
        <article key={x.id}>
         <ProductImage src={x.image} alt={x.name}/>
         <div>
          <a href={'#/product/'+x.slug} onClick={close}>{x.name}</a>
          <p>{x.price===null?'Chưa có giá':formatMoney(x.price)} × {x.quantity}</p>
          {x.price_is_demo&&<small>Giá demo · chưa xác minh</small>}
          {mode==='cart'&&<button onClick={()=>removeFromCart(x.id)}>Xóa sản phẩm</button>}
         </div>
        </article>
       ))}
      </div>
      <div className="purchase-total">
       <span>Tạm tính</span>
       <strong>{formatMoney(total)}</strong>
      </div>
      <p className="data-note">Chưa gồm phí vận chuyển. Chức năng xác nhận đơn sẽ được kết nối khi backend sẵn sàng.</p>
     </>
    ):(
     <p className="purchase-empty">Giỏ hàng chưa có sản phẩm.</p>
    )}
    <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
     <button className="button" onClick={close}>Tiếp tục khám phá</button>
     <a href="#/cart" className="button" onClick={close}>Đến trang Giỏ hàng ↗</a>
    </div>
   </dialog>
  </div>
 );
}
