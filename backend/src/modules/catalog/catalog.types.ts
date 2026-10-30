export interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

export interface ProductImage {
  url: string;
  alt: string;
  sort_order: number;
  source_url?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  category_name: string;
  sku: string | null;
  price_vnd: number | null;
  sale_price_vnd: number | null;
  current_price_vnd: number | null;
  description: string;
  attributes: Record<string, string>;
  images: ProductImage[];
  source_name: string;
  source_url: string;
  origin: string | null;
  collected_at: string;
  is_demo: boolean;
  price_is_demo: boolean;
  stock_quantity: number;
  status: string;
}

export interface Review {
  id: string;
  rating: number;
  author_name: string;
  body: string;
  created_at: string;
  status: 'visible';
  is_demo: boolean;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface ProductFilters {
  q?: string;
  category_id?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort: ProductSort;
  page: number;
  limit: number;
}
