import catalog from './catalog.json';
import {queryProducts} from '../src/features/catalog/query';
import type {Product} from '../src/lib/types';
import {handleC2Mock} from './c2Mock';
const products=catalog.products as Product[];
export async function mockApi(req:any,res:any,next:any){
 const url=new URL(req.url||'/','http://localhost');if(!url.pathname.startsWith('/api/v1/'))return next();
 const send=(code:number,data:unknown)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Lang-Moc-Data','mock');res.end(JSON.stringify(data))};
 if(await handleC2Mock(req,res,url,send))return;
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:{code:'METHOD_NOT_ALLOWED',message:'Mock storefront chỉ hỗ trợ GET.'}}));return;}
 setTimeout(()=>{
 if(url.searchParams.get('_demo')==='error')return send(503,{error:{code:'DEMO_ERROR',message:'Tình huống lỗi API minh họa. Bạn có thể thử lại.'}});
 const path=decodeURIComponent(url.pathname.replace('/api/v1',''));
 if(path==='/categories')return send(200,{data:catalog.categories});
 if(path==='/products'){try{return send(200,queryProducts(products,Object.fromEntries(url.searchParams)))}catch(e){return send(400,{error:{code:'VALIDATION_ERROR',message:(e as Error).message}})}}
 const review=path.match(/^\/products\/([^/]+)\/reviews$/);
 if(review){if(!products.some(p=>p.id===review[1]))return send(404,{error:{code:'NOT_FOUND',message:'Không tìm thấy sản phẩm.'}});
 const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||5);if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(limit)||limit<1||limit>100)return send(400,{error:{code:'VALIDATION_ERROR',message:'Phân trang đánh giá không hợp lệ.'}});
 const rows=((catalog.reviews as Record<string,any[]>)[review[1]]||[]).filter(r=>r.status==='visible');return send(200,{data:rows.slice((page-1)*limit,page*limit),meta:{page,limit,total:rows.length},summary:{average_rating:rows.length?rows.reduce((a,r)=>a+r.rating,0)/rows.length:null,review_count:rows.length},is_demo:true});}
 const detail=path.match(/^\/products\/([^/]+)$/);if(detail){const p=products.find(p=>p.slug===detail[1]);return p?send(200,{data:p}):send(404,{error:{code:'NOT_FOUND',message:'Không tìm thấy sản phẩm.'}})}
 send(404,{error:{code:'NOT_FOUND',message:'Không tìm thấy endpoint.'}});
 },url.searchParams.get('_demo')==='slow'?1600:180);
}
