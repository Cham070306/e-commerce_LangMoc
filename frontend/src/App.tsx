import {useEffect,useState} from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import Product from './pages/Product';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Contact from './pages/Contact';
import Policies from './pages/Policies';
import AdminApp from './features/admin/AdminApp';
import {AuthProvider} from './features/auth/AuthContext';
import {CartProvider} from './features/cart/CartContext';
import {RequireAuth,RequireAdmin} from './features/auth/guards';
import './styles/c2.css';

function AppContent(){
 const [hash,setHash]=useState(location.hash||'#/');
 useEffect(()=>{const change=()=>setHash(location.hash||'#/');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
 const [route,query='']=hash.replace(/^#/,'').split('?');
 const home=['','/','main','lang-nghe','cau-chuyen','danh-muc','san-pham','lien-he'].includes(route);
 useEffect(()=>{
  if(route.startsWith('/'))window.scrollTo({top:0,behavior:'instant'});
  else requestAnimationFrame(()=>document.getElementById(route)?.scrollIntoView({behavior:'smooth'}));
  document.title=route.startsWith('/catalog')?'Bộ sưu tập thủ công | Làng Mộc':route.startsWith('/product')?'Chi tiết sản phẩm | Làng Mộc':route==='/cart'?'Giỏ hàng | Làng Mộc':route==='/checkout'?'Thanh toán đơn hàng | Làng Mộc':route.startsWith('/order-success')?'Đặt hàng thành công | Làng Mộc':route.startsWith('/orders')?'Đơn hàng của tôi | Làng Mộc':route==='/contact'?'Liên hệ & Góp ý | Làng Mộc':route.startsWith('/policies')?'Chính sách dịch vụ | Làng Mộc':route==='/login'?'Đăng nhập | Làng Mộc':route==='/register'?'Đăng ký tài khoản | Làng Mộc':route.startsWith('/account')?'Tài khoản của tôi | Làng Mộc':route.startsWith('/admin')?'Quản trị hệ thống | Làng Mộc':'Làng Mộc — Nét Việt, từ đôi bàn tay';
 },[hash,route]);
 const pageKey=route.startsWith('/product')?'product':route.startsWith('/catalog')?'catalog':route.startsWith('/account')?'account':route.startsWith('/orders')?'orders':route.startsWith('/policies')?'policies':route==='/contact'?'contact':route;
 const page=<div className="page-transition" key={pageKey}>
   {route==='/catalog'?<Catalog params={new URLSearchParams(query)}/>:
    route.startsWith('/product/')?<Product slug={decodeURIComponent(route.slice(9))}/>:
    route==='/cart'?<Cart/>:
    route==='/checkout'?<RequireAuth><Checkout/></RequireAuth>:
    route.startsWith('/order-success/')?<RequireAuth><OrderSuccess id={route.replace('/order-success/','')}/></RequireAuth>:
    route.startsWith('/orders/')?<RequireAuth><OrderDetail id={decodeURIComponent(route.replace('/orders/',''))}/></RequireAuth>:
    route==='/orders'?<RequireAuth><Orders/></RequireAuth>:
    route==='/contact'?<Contact/>:
    route.startsWith('/policies')?<Policies subroute={route.replace('/policies','').replace(/^\//,'')}/>:
    route==='/login'?<Login/>:
    route==='/register'?<Register/>:
    route==='/account'?<RequireAuth><Account/></RequireAuth>:
    route==='/account/addresses'?<RequireAuth><Account initialTab="addresses"/></RequireAuth>:
    route.startsWith('/admin')?<RequireAdmin><AdminApp route={route} query={query}/></RequireAdmin>:
    home?<Home/>:
    <main id="main" className="store-page state-box"><h1>Trang chưa tồn tại</h1><a href="#/">Về trang chủ</a></main>}
  </div>;
 if(route.startsWith('/admin'))return page;
 return <>
  <Header home={home}/>
  {page}
  <Footer/>
 </>;
}

export default function App(){
 return (
  <AuthProvider>
   <CartProvider>
    <AppContent/>
   </CartProvider>
  </AuthProvider>
 );
}
