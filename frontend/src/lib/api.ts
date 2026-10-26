import type {Category,Product,List,Reviews,Filters,User,Address,RegisterPayload,LoginPayload,AddressPayload,CartItem,CartData,CheckoutPreview,PreviewPayload,Order,CreateOrderPayload,ContactPayload,ContactMessage} from './types';
import { ADMIN_API, ADMIN_PAGE_DEFAULT, ADMIN_PAGE_SIZE } from './adminContracts';
import type {
  AdminItemResponse,
  AdminOrder,
  AdminOrdersQuery,
  AdminShipmentPayload,
  AdminOrderStatusPayload,
  AdminListResponse,
  AdminCategory,
  AdminCategoryWrite,
  AdminProduct,
  AdminProductWrite,
  AdminReview,
  AdminReviewWrite,
  AdminContactMessage,
  AdminContactWrite
} from './adminContracts';
const env=(import.meta as ImportMeta&{env:Record<string,string>}).env;
export const isMock=env.VITE_API_MODE!=='live';

export class ApiError extends Error{
  status:number;
  code?:string;
  fields?:Record<string,string>;
  constructor(message:string,status:number,code?:string,fields?:Record<string,string>){
    super(message);
    this.status=status;
    this.code=code;
    this.fields=fields;
  }
}

export async function request<T>(method:string,path:string,body?:unknown,signal?:AbortSignal,headers:Record<string,string>={}):Promise<T>{
  const demo=isMock?new URLSearchParams(location.search).get('demo'):null;
  if(demo)path+=(path.includes('?')?'&':'?')+'_demo='+encodeURIComponent(demo);
  const reqHeaders:Record<string,string>={Accept:'application/json',...headers};
  if(body!==undefined){
    reqHeaders['Content-Type']='application/json';
  }
  const res=await fetch((env.VITE_API_BASE_URL||'/api/v1')+path,{
    method,
    signal,
    credentials:'include',
    headers:reqHeaders,
    body:body!==undefined?JSON.stringify(body):undefined
  });
  if(res.status===204){
    return undefined as unknown as T;
  }
  const data=await res.json().catch(()=>null);
  if(!res.ok){
    throw new ApiError(data?.error?.message||'Không thể hoàn thành yêu cầu. Vui lòng thử lại.',res.status,data?.error?.code,data?.error?.fields);
  }
  if(!data||!('data' in data)){
    throw new ApiError('Phản hồi API không đúng định dạng.',502);
  }
  return data;
}

async function get<T>(path:string,signal?:AbortSignal):Promise<T>{
  return request<T>('GET',path,undefined,signal);
}

export const api={
  categories:(s?:AbortSignal)=>get<{data:Category[]}>('/categories',s),
  products:(f:Filters={},s?:AbortSignal)=>get<List<Product>>('/products?'+new URLSearchParams(Object.entries(f).filter(([,v])=>v!==undefined&&v!=='') as [string,string][]),s),
  product:(slug:string,s?:AbortSignal)=>get<{data:Product}>('/products/'+encodeURIComponent(slug),s),
  reviews:(id:string,page=1,s?:AbortSignal)=>get<Reviews>(`/products/${encodeURIComponent(id)}/reviews?page=${page}&limit=5`,s),
  
  // Auth & Account
  register:(b:RegisterPayload)=>request<{data:User}>('POST','/auth/register',b),
  login:(b:LoginPayload)=>request<{data:User}>('POST','/auth/login',b),
  logout:()=>request<void>('POST','/auth/logout'),
  me:(s?:AbortSignal)=>request<{data:User}>('GET','/auth/me',undefined,s),
  
  // Addresses (chỉ GET và POST theo docs/API.md)
  addresses:(s?:AbortSignal)=>request<{data:Address[]}>('GET','/me/addresses',undefined,s),
  createAddress:(b:AddressPayload)=>request<{data:Address}>('POST','/me/addresses',b),

  // Cart & Preview (docs/API.md lines 47-50)
  cart:(s?:AbortSignal)=>request<{data:CartData}>('GET','/me/cart',undefined,s),
  updateCartItem:(productId:string,quantity:number)=>request<{data:CartItem}>('PUT',`/me/cart/items/${encodeURIComponent(productId)}`,{quantity}),
  removeCartItem:(productId:string)=>request<void>('DELETE',`/me/cart/items/${encodeURIComponent(productId)}`),
  checkoutPreview:(b:PreviewPayload,s?:AbortSignal)=>request<{data:CheckoutPreview}>('POST','/checkout/preview',b,s),

  // Orders (docs/API.md lines 51-54)
  createOrder:(b:CreateOrderPayload,idempotencyKey:string,s?:AbortSignal)=>request<{data:Order}>('POST','/orders',b,s,{'Idempotency-Key':idempotencyKey}),
  order:(id:string,s?:AbortSignal)=>request<{data:Order}>('GET',`/me/orders/${encodeURIComponent(id)}`,undefined,s),
  orders:(pageOrParams: number | {page?:number;limit?:number;status?:string} = 1, limit = 10, s?:AbortSignal)=>{
    const params = typeof pageOrParams === 'object' ? pageOrParams : { page: pageOrParams, limit };
    const sp = new URLSearchParams();
    if(params.page) sp.set('page', String(params.page));
    if(params.limit) sp.set('limit', String(params.limit));
    if(params.status && params.status !== 'all') sp.set('status', params.status);
    const qs = sp.toString();
    return request<{data:Order[];meta:{page:number;limit:number;total:number}}>('GET',`/me/orders${qs ? `?${qs}` : ''}`,undefined,s);
  },
  cancelOrder:(id:string,reason?:string,s?:AbortSignal)=>request<{data:Order}>('POST',`/me/orders/${encodeURIComponent(id)}/cancel`,{reason},s),

  adminOrders:(params:AdminOrdersQuery={},s?:AbortSignal)=>{
    const search = new URLSearchParams({
      page: String(params.page ?? ADMIN_PAGE_DEFAULT),
      limit: String(params.limit ?? ADMIN_PAGE_SIZE)
    });
    if(params.status) search.set('status',params.status);
    return request<AdminListResponse<AdminOrder>>('GET',`${ADMIN_API.orders}?${search}`,undefined,s);
  },
  adminOrder:(id:string,s?:AbortSignal)=>request<AdminItemResponse<AdminOrder>>('GET',ADMIN_API.order(id),undefined,s),
  updateAdminOrderStatus:(id:string,payload:AdminOrderStatusPayload)=>request<AdminItemResponse<AdminOrder>>('PATCH',ADMIN_API.orderStatus(id),payload),
  updateAdminShipment:(id:string,payload:AdminShipmentPayload)=>request<AdminItemResponse<AdminOrder>>('PATCH',ADMIN_API.orderShipment(id),payload),

  // Admin Categories (docs/API.md dòng 90-91)
  adminCategories:(s?:AbortSignal)=>
    request<{data:AdminCategory[]}>('GET',ADMIN_API.categories,undefined,s),
  createAdminCategory:(b:AdminCategoryWrite,s?:AbortSignal)=>
    request<{data:AdminCategory}>('POST',ADMIN_API.categories,b,s),
  updateAdminCategory:(id:string,b:Partial<AdminCategoryWrite>,s?:AbortSignal)=>
    request<{data:AdminCategory}>('PATCH',`${ADMIN_API.categories}/${encodeURIComponent(id)}`,b,s),

  // Admin Products (docs/API.md dòng 92-93)
  adminProducts:(params:{category_id?:string;status?:string;page?:number;limit?:number}={},s?:AbortSignal)=>{
    const sp = new URLSearchParams();
    if(params.page) sp.set('page',String(params.page));
    if(params.limit) sp.set('limit',String(params.limit));
    if(params.category_id) sp.set('category_id',params.category_id);
    if(params.status) sp.set('status',params.status);
    const qs = sp.toString();
    return request<AdminListResponse<AdminProduct>>('GET',`${ADMIN_API.products}${qs ? `?${qs}` : ''}`,undefined,s);
  },
  createAdminProduct:(b:AdminProductWrite,s?:AbortSignal)=>
    request<{data:AdminProduct}>('POST',ADMIN_API.products,b,s),
  updateAdminProduct:(id:string,b:Partial<AdminProductWrite>,s?:AbortSignal)=>
    request<{data:AdminProduct}>('PATCH',`${ADMIN_API.products}/${encodeURIComponent(id)}`,b,s),

  // Admin Reviews (docs/API.md dòng 99)
  adminReviews:(params:{status?:string;page?:number;limit?:number}={},s?:AbortSignal)=>{
    const sp = new URLSearchParams();
    if(params.page) sp.set('page',String(params.page));
    if(params.limit) sp.set('limit',String(params.limit));
    if(params.status) sp.set('status',params.status);
    const qs = sp.toString();
    return request<AdminListResponse<AdminReview>>('GET',`${ADMIN_API.reviews}${qs ? `?${qs}` : ''}`,undefined,s);
  },
  updateAdminReview:(id:string,b:AdminReviewWrite,s?:AbortSignal)=>
    request<{data:AdminReview}>('PATCH',`${ADMIN_API.reviews}/${encodeURIComponent(id)}`,b,s),

  // Admin Contact (docs/API.md dòng 100)
  adminContact:(params:{status?:string;page?:number;limit?:number}={},s?:AbortSignal)=>{
    const sp = new URLSearchParams();
    if(params.page) sp.set('page',String(params.page));
    if(params.limit) sp.set('limit',String(params.limit));
    if(params.status) sp.set('status',params.status);
    const qs = sp.toString();
    return request<AdminListResponse<AdminContactMessage>>('GET',`${ADMIN_API.contact}${qs ? `?${qs}` : ''}`,undefined,s);
  },
  updateAdminContact:(id:string,b:AdminContactWrite,s?:AbortSignal)=>
    request<{data:AdminContactMessage}>('PATCH',`${ADMIN_API.contact}/${encodeURIComponent(id)}`,b,s),
  
  // Contact & Feedback (docs/API.md dòng 81)
  sendContact:(b:ContactPayload,s?:AbortSignal)=>request<{data:ContactMessage}>('POST','/contact',b,s)
};
