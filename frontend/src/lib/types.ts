export interface Category { id:string; name:string; slug:string; product_count:number }
export interface ProductImage {source_url?:string;url:string;alt:string;sort_order:number}
export interface Product {price_is_demo?:boolean;id:string;slug:string;name:string;category_id:string;category_name:string;sku:string|null;price_vnd:number|null;sale_price_vnd:number|null;current_price_vnd:number|null;description:string;attributes:Record<string,string>;images:ProductImage[];source_name:string;source_url:string;origin:string|null;collected_at:string;is_demo:boolean;description_image_urls?:string[];price_range_vnd?:{min:number;max:number}}
export interface Review {id:string;rating:number;author_name:string;body:string;created_at:string;status:'visible';is_demo:boolean}
export interface List<T>{data:T[];meta:{page:number;limit:number;total:number}}
export interface Reviews extends List<Review>{summary:{average_rating:number|null;review_count:number};is_demo?:boolean}
export type Sort='newest'|'price_asc'|'price_desc'|'name_asc';
export interface Filters {q?:string;category_id?:string;min_price?:string;max_price?:string;sort?:string;page?:string;limit?:string}
