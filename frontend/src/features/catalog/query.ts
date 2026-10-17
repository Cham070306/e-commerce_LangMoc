import type {Product,Filters,List} from '../../lib/types.ts';
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
export function queryProducts(products:Product[],filters:Filters):List<Product>{
 const min=filters.min_price?Number(filters.min_price):null,max=filters.max_price?Number(filters.max_price):null;
 if((min!==null&&(!Number.isSafeInteger(min)||min<0))||(max!==null&&(!Number.isSafeInteger(max)||max<0))||(min!==null&&max!==null&&min>max))throw new Error('Khoảng giá không hợp lệ.');
 const sort=filters.sort||'newest';if(!['newest','price_asc','price_desc','name_asc'].includes(sort))throw new Error('Thứ tự sắp xếp không hợp lệ.');
 const page=Number(filters.page||1),limit=Number(filters.limit||12);
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('Phân trang không hợp lệ.');
 let rows=products.filter(p=>(!filters.q||normalize(p.name+' '+p.source_name+' '+p.category_name).includes(normalize(filters.q)))&&(!filters.category_id||p.category_id===filters.category_id)&&(min===null||(p.current_price_vnd!==null&&p.current_price_vnd>=min))&&(max===null||(p.current_price_vnd!==null&&p.current_price_vnd<=max)));
 rows=[...rows].sort((a,b)=>{
  if(sort.startsWith('price_')){if(a.current_price_vnd===null)return b.current_price_vnd===null?a.id.localeCompare(b.id):1;if(b.current_price_vnd===null)return -1;return (sort==='price_asc'?a.current_price_vnd-b.current_price_vnd:b.current_price_vnd-a.current_price_vnd)||a.id.localeCompare(b.id)}
  if(sort==='name_asc')return a.name.localeCompare(b.name,'vi')||a.id.localeCompare(b.id);
  return b.collected_at.localeCompare(a.collected_at)||a.id.localeCompare(b.id);
 });
 return {data:rows.slice((page-1)*limit,page*limit),meta:{page,limit,total:rows.length}};
}
