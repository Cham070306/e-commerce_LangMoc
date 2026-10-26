import React,{useEffect,useState} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';
import {api} from '../lib/api';
import {useResource} from '../lib/useResource';
import CatalogBanner from '../components/catalog/CatalogBanner';
import ProductCard from '../components/catalog/ProductCard';
import {Loading,ErrorState,Pagination} from '../components/common/States';

export default function Catalog({params}:{params:URLSearchParams}){
 const key=params.toString();
 const [q,setQ]=useState(params.get('q')||''),[min,setMin]=useState(params.get('min_price')||''),[max,setMax]=useState(params.get('max_price')||''),[invalid,setInvalid]=useState(''),[filtersOpen,setFiltersOpen]=useState(false);
 useEffect(()=>{setQ(params.get('q')||'');setMin(params.get('min_price')||'');setMax(params.get('max_price')||'');setInvalid('')},[key]);
 const cats=useResource(s=>api.categories(s),'categories');
 const categoryId=params.get('category_id')||cats.data?.data.find(c=>c.slug===params.get('category'))?.id;
 const categoryReady=!params.get('category')||!!cats.data;
 const result=useResource(async s=>{if(!categoryReady)return null;if(params.get('category')&&!categoryId)throw new Error('Danh mục không tồn tại. Vui lòng chọn danh mục khác.');return api.products({q:params.get('q')||'',category_id:categoryId,min_price:params.get('min_price')||'',max_price:params.get('max_price')||'',sort:params.get('sort')||'newest',page:params.get('page')||'1',limit:'12'},s)},key+'|'+categoryId+'|'+categoryReady);
 function update(changes:Record<string,string>,reset=true){const next=new URLSearchParams(params);for(const [k,v] of Object.entries(changes)){if(v)next.set(k,v);else next.delete(k)}if(reset)next.delete('page');location.hash='/catalog'+(next.size?'?'+next:'')}
 function applyPrice(){if((min&&Number(min)<0)||(max&&Number(max)<0)||(min&&max&&Number(min)>Number(max))){setInvalid('Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.');return}setInvalid('');update({min_price:min,max_price:max})}
 const priceCeiling=Math.max(6000000,Number(params.get('max_price'))||0,Number(params.get('min_price'))||0),lower=Math.max(0,Math.min(Number(min)||0,priceCeiling)),upper=max?Math.max(lower,Math.min(Number(max)||0,priceCeiling)):priceCeiling;
 const money=(value:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);
 const total=result.data?.meta.total||0,page=result.data?.meta.page||Number(params.get('page')||1),pages=Math.max(1,Math.ceil(total/12));
 return <main id="main" className="store-page catalog-page">
  <CatalogBanner/>
  <div className="catalog-workspace" id="catalog-products">
   <button className="catalog-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-sidebar" onClick={()=>setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17}/> {filtersOpen?'Thu gọn bộ lọc':'Tìm kiếm & bộ lọc'}</button>
   <aside id="catalog-sidebar" className={'catalog-sidebar'+(filtersOpen?' is-open':'')} aria-label="Tìm kiếm và lọc sản phẩm">
    <h2>Bộ lọc</h2>
    <div className="sidebar-group"><h3>Danh mục</h3><div className="sidebar-categories"><button aria-pressed={!categoryId} onClick={()=>update({category:'',category_id:''})}>Tất cả</button>{cats.data?.data.map(c=><button key={c.id} aria-pressed={categoryId===c.id} onClick={()=>update({category:c.slug,category_id:''})}><span>{c.name}</span><small>{c.product_count}</small></button>)}</div>{cats.error&&<p role="alert">Chưa tải được danh mục. <button onClick={cats.retry}>Thử lại</button></p>}</div>
    <form className="sidebar-price sidebar-group" onSubmit={e=>{e.preventDefault();applyPrice()}}><h3>Khoảng giá</h3><div className="price-range-summary"><span>{money(lower)}</span><span>{max?money(upper):'Không giới hạn'}</span></div><div className="dual-price-slider" style={{'--range-start':`${lower/priceCeiling*100}%`,'--range-end':`${upper/priceCeiling*100}%`} as React.CSSProperties}><div className="dual-price-track" aria-hidden="true"/><label className="sr-only" htmlFor="min-price">Giá thấp nhất</label><input id="min-price" type="range" min="0" max={priceCeiling} step="1000" value={lower} aria-valuetext={money(lower)} onChange={e=>setMin(String(Math.min(Number(e.target.value),upper)))}/><label className="sr-only" htmlFor="max-price">Giá cao nhất</label><input id="max-price" type="range" min="0" max={priceCeiling} step="1000" value={upper} aria-valuetext={max?money(upper):'Không giới hạn'} onChange={e=>{const value=Math.max(Number(e.target.value),lower);setMax(value===priceCeiling?'':String(value))}}/></div><p className="price-range-hint">Kéo hai đầu trên thanh để chọn khoảng giá.</p>{invalid&&<p className="field-error" role="alert">{invalid}</p>}<button className="button" type="submit">Áp dụng</button></form>
    {(params.get('min_price')||params.get('max_price')||params.get('q')||categoryId)&&<button className="sidebar-reset" onClick={()=>{setQ('');setMin('');setMax('');location.hash='/catalog'}}>Xóa tất cả bộ lọc</button>}
   </aside>
   <div className="catalog-main-column"><div className="catalog-results-toolbar"><form className="catalog-toolbar-search" role="search" onSubmit={e=>{e.preventDefault();update({q:q.trim()})}}><label className="sr-only" htmlFor="catalog-q">Tìm sản phẩm</label><input id="catalog-q" type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm sản phẩm…"/><button type="submit" aria-label="Tìm kiếm"><Search size={18}/></button></form><label className="catalog-sort"><span>Sắp xếp</span><select value={params.get('sort')||'newest'} onChange={e=>update({sort:e.target.value})}><option value="newest">Mới nhất</option><option value="price_asc">Giá thấp → cao</option><option value="price_desc">Giá cao → thấp</option><option value="name_asc">Tên A–Z</option></select></label></div><div className="catalog-results catalog-results-wide">{cats.error&&params.get('category')?<ErrorState message={cats.error.message} retry={cats.retry}/>:result.loading||!categoryReady?<Loading/>:result.error?<ErrorState message={result.error.message} retry={result.retry}/>:result.data?.data.length?<><div className="product-grid catalog-grid">{result.data.data.map(p=><ProductCard key={p.id} product={p}/>)}</div><Pagination page={page} total={total} limit={12} onChange={n=>update({page:String(n)},false)}/><p className="page-caption">Trang {page} / {pages}</p></>:<div className="state-box"><h2>{page>pages?'Trang này chưa có sản phẩm':'Chưa tìm thấy sản phẩm phù hợp'}</h2><p>Thử thay từ khóa hoặc mở rộng khoảng giá.</p><a className="button" href="#/catalog">Xem tất cả sản phẩm</a></div>}</div></div>
  </div>
 </main>;
}
