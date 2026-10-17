import {useEffect,useState} from 'react';
const slides=['/images/crafts/07-ceramic-painting.jpeg','/images/crafts/08-pottery-wheel.jpeg','/images/crafts/09-decorative-ceramics.jpeg'];
export default function CatalogBanner(){
 const [active,setActive]=useState(0);
 useEffect(()=>{const timer=window.setInterval(()=>setActive(current=>(current+1)%slides.length),6500);return()=>window.clearInterval(timer)},[]);
 return <section className="catalog-banner" aria-roledescription="carousel" aria-label="Câu chuyện thủ công nổi bật">{slides.map((image,index)=><img key={image} className={index===active?'is-active':''} src={image} alt="" aria-hidden={index!==active}/>)}<div className="catalog-banner-copy"><nav className="banner-breadcrumb" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>›</span><span aria-current="page">Sản phẩm</span></nav><p className="eyebrow">Làng Mộc · Tinh hoa thủ công Việt</p><h1>Giữ một nét nghề trong nhà.</h1><p>Chất liệu tự nhiên, câu chuyện Việt và những món đồ có hồn.</p><a href="#catalog-products" className="banner-link">Khám phá bộ sưu tập <span>↓</span></a></div></section>;
}
