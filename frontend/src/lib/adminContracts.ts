import type { OrderStatus, PaymentStatus } from './orderStatus';
import type { Order, OrderItem } from './types';

export const ADMIN_API = {
  orders: '/admin/orders',
  order: (id: string) => `/admin/orders/${encodeURIComponent(id)}`,
  orderStatus: (id: string) => `/admin/orders/${encodeURIComponent(id)}/status`,
  orderShipment: (id: string) => `/admin/orders/${encodeURIComponent(id)}/shipment`,
  categories: '/admin/categories',
  products: '/admin/products',
  reviews: '/admin/reviews',
  contact: '/admin/contact'
} as const;

export const ADMIN_PAGE_DEFAULT = 1;
export const ADMIN_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE_MAX = 100;

export interface AdminOrdersQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface AdminShipment {
  carrier: string | null;
  tracking_number: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
}

export interface AdminOrder extends Omit<Order, 'payment_status'> {
  user_id: string;
  payment_status?: PaymentStatus;
  items: OrderItem[];
  shipment?: AdminShipment | null;
}

export interface AdminOrderStatusPayload {
  status: OrderStatus;
}

export interface AdminShipmentPayload {
  carrier: string;
  tracking_number: string;
}

export interface AdminListResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface AdminItemResponse<T> {
  data: T;
}

export interface AdminContractAssumptions {
  categories: {
    create: AdminCategoryWrite;
    update: Partial<AdminCategoryWrite>;
  };
  products: {
    create: AdminProductWrite;
    update: Partial<AdminProductWrite>;
  };
  reviews: { update: AdminReviewWrite };
  contact: { update: AdminContactWrite };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  product_count?: number;
}

export type AdminCategoryWrite = Pick<AdminCategory, 'name' | 'slug'> & {
  parent_id?: string | null;
  is_active?: boolean;
};

export interface AdminProduct {
  id: string;
  seller_id: string | null;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  material: string | null;
  origin_province: string | null;
  price_vnd: number;
  sale_price_vnd: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock_quantity: number;
  status: 'draft' | 'active' | 'hidden';
  created_at: string;
  updated_at: string;
}

export type AdminProductWrite = Pick<AdminProduct,
  'category_id' | 'name' | 'slug' | 'description' | 'material' | 'origin_province' |
  'price_vnd' | 'sale_price_vnd' | 'sale_starts_at' | 'sale_ends_at' | 'stock_quantity' | 'status'
> & { seller_id?: string | null };

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  status: 'pending' | 'visible' | 'hidden';
  created_at: string;
}

export interface AdminReviewWrite {
  status: 'visible' | 'hidden';
}

export interface AdminContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'resolved';
  created_at: string;
}

export interface AdminContactWrite {
  status: 'read' | 'resolved';
}
