import type {Category,Product,List,Reviews,Filters} from './types';
const env=(import.meta as ImportMeta&{env:Record<string,string>}).env;
export const isMock=env.VITE_API_MODE!=='live';
export class ApiError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status}}
async function get<T>(path:string,signal?:AbortSignal):Promise<T>{
 const demo=isMock?new URLSearchParams(location.search).get('demo'):null;
 if(demo)path+=(path.includes('?')?'&':'?')+'_demo='+encodeURIComponent(demo);
 const res=await fetch((env.VITE_API_BASE_URL||'/api/v1')+path,{signal,credentials:'include',headers:{Accept:'application/json'}});
 const data=await res.json().catch(()=>null);if(!res.ok)throw new ApiError(data?.error?.message||'Không thể tải dữ liệu. Vui lòng thử lại.',res.status);
 if(!data||!('data' in data))throw new ApiError('Phản hồi API không đúng định dạng.',502);return data;
}
export const api={categories:(s?:AbortSignal)=>get<{data:Category[]}>('/categories',s),products:(f:Filters={},s?:AbortSignal)=>get<List<Product>>('/products?'+new URLSearchParams(Object.entries(f).filter(([,v])=>v!==undefined&&v!=='') as [string,string][]),s),product:(slug:string,s?:AbortSignal)=>get<{data:Product}>('/products/'+encodeURIComponent(slug),s),reviews:(id:string,page=1,s?:AbortSignal)=>get<Reviews>(`/products/${encodeURIComponent(id)}/reviews?page=${page}&limit=5`,s)};
