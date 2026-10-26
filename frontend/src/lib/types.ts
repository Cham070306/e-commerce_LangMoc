export interface Category { id:string; name:string; slug:string; product_count:number }
export interface ProductImage {source_url?:string;url:string;alt:string;sort_order:number}
export interface Product {price_is_demo?:boolean;id:string;slug:string;name:string;category_id:string;category_name:string;sku:string|null;price_vnd:number|null;sale_price_vnd:number|null;current_price_vnd:number|null;description:string;attributes:Record<string,string>;images:ProductImage[];source_name:string;source_url:string;origin:string|null;collected_at:string;is_demo:boolean;description_image_urls?:string[];price_range_vnd?:{min:number;max:number}}
export interface Review {id:string;rating:number;author_name:string;body:string;created_at:string;status:'visible';is_demo:boolean}
export interface List<T>{data:T[];meta:{page:number;limit:number;total:number}}
export interface Reviews extends List<Review>{summary:{average_rating:number|null;review_count:number};is_demo?:boolean}
export type Sort='newest'|'price_asc'|'price_desc'|'name_asc';
export interface Filters {q?:string;category_id?:string;min_price?:string;max_price?:string;sort?:string;page?:string;limit?:string}

export type UserRole = 'customer' | 'admin';
export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
}
export interface Address {
  id: string;
  user_id?: string;
  full_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street_address: string;
  is_default?: boolean;
  created_at?: string;
}
export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}
export interface LoginPayload {
  email: string;
  password: string;
}
export interface AddressPayload {
  full_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street_address: string;
  is_default?: boolean;
}
export interface ApiErrorDetail {
  code?: string;
  message: string;
  fields?: Record<string, string>;
}

export interface CartItem {
  product_id: string;
  product_slug: string;
  product_name: string;
  image_url: string;
  price_vnd: number | null;
  quantity: number;
  stock_quantity: number;
  origin?: string | null;
  price_is_demo?: boolean;
}

export interface CartData {
  items: CartItem[];
  subtotal_vnd: number;
}

export interface CheckoutPreview {
  subtotal_vnd: number;
  discount_vnd: number;
  shipping_fee_vnd: number;
  total_vnd: number;
  promotion_code?: string | null;
  promotion_discount_vnd?: number;
  promotion_valid?: boolean;
  promotion_message?: string;
}

export interface PreviewPayload {
  address_id?: string;
  promotion_code?: string;
  payment_method?: 'cod';
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product_name: string;
  product_image_url?: string | null;
  unit_price_vnd: number;
  quantity: number;
  line_total_vnd: number;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: 'cod' | 'bank_transfer' | 'gateway';
  recipient_name: string;
  phone: string;
  shipping_address: string;
  note?: string | null;
  subtotal_vnd: number;
  discount_vnd: number;
  shipping_fee_vnd: number;
  total_vnd: number;
  promotion_code?: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface CreateOrderPayload {
  address_id: string;
  promotion_code?: string;
  payment_method: 'cod';
  note?: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMessage {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at: string;
}


