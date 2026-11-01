import {useState} from 'react';
import {api} from '../../lib/api';
import {useResource} from '../../lib/useResource';
import ProductCard from './ProductCard';
import {Loading,ErrorState} from '../common/States';

async function loadCraftMix(signal:AbortSignal){
 const first=await api.products({limit:'100',sort:'newest'},signal);
 const seen=new Set<string>();
 const selected=first.data.filter(product=>{
  if(seen.has(product.category_id))return false;
  seen.add(product.category_id);
  return true;
 });
 for(const product of first.data){
  if(selected.length>=4)break;
  if(!selected.some(item=>item.id===product.id))selected.push(product);
 }
 return {...first,data:selected.slice(0,4)};
}

export default function FeaturedProducts({curated=false}:{curated?:boolean}){
 const [category,setCategory]=useState('');
 const categories=useResource(s=>api.categories(s),'home-categories');
 const r=useResource(s=>curated?loadCraftMix(s):api.products({limit:'4',sort:'newest',category_id:category},s),`home-products-${curated}-${category}`);
 const products=(r.data?.data||[]).slice(0,4);
 return <section className={'section products home-product-section'+(curated?' home-curated':'')} id={curated?'chat-lieu':'san-pham'}>
  <div className="section-heading"><div><p className="eyebrow">{curated?'Bốn lát cắt thủ công':'Được chọn cho nếp nhà'}</p><h2>{curated?<>Một vòng <em>chất liệu.</em></>:<>Những món đồ <em>đáng khám phá.</em></>}</h2></div><a className="text-link" href="#/catalog">Xem tất cả ↗</a></div>
  {curated?<p className="offers-note">Bốn gợi ý được chọn từ những dòng nghề khác nhau để bạn cảm nhận rõ hơn chất liệu và dấu tay người thợ.</p>:<div className="home-product-tabs" role="group" aria-label="Danh mục sản phẩm nổi bật"><button aria-pressed={!category} onClick={()=>setCategory('')}>Tất cả</button>{categories.data?.data.filter(c=>c.product_count>0).map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>setCategory(c.id)}>{c.name}</button>)}</div>}
  {r.loading?<Loading/>:r.error?<ErrorState message={r.error.message} retry={r.retry}/>:products.length?<div className="product-grid">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<p className="state-box">Chưa có sản phẩm phù hợp. Bạn có thể khám phá danh mục khác.</p>}
 </section>
}
