import type { Category, Product, ProductImage, Review } from './catalog.types.js';

/** Dòng join products + categories + ảnh đại diện, dùng cho list/detail. */
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category_id: string;
  category_name: string;
  sku: string | null;
  price_vnd: string;
  sale_price_vnd: string | null;
  current_price_vnd: string;
  description: string;
  attributes: Record<string, string> | null;
  origin_province: string | null;
  source_name: string | null;
  source_url: string | null;
  collected_at: Date | null;
  is_demo: boolean;
  price_is_demo: boolean;
  stock_quantity: number;
  status: string;
  created_at: Date;
  images: ProductImage[] | null;
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category_id: row.category_id,
    category_name: row.category_name,
    sku: row.sku,
    price_vnd: Number(row.price_vnd),
    sale_price_vnd: row.sale_price_vnd === null ? null : Number(row.sale_price_vnd),
    current_price_vnd: Number(row.current_price_vnd),
    description: row.description,
    attributes: row.attributes ?? {},
    images: row.images ?? [],
    source_name: row.source_name ?? '',
    source_url: row.source_url ?? '',
    origin: row.origin_province,
    collected_at: (row.collected_at ?? row.created_at).toISOString(),
    is_demo: row.is_demo,
    price_is_demo: row.price_is_demo,
    stock_quantity: row.stock_quantity,
    status: row.status,
  };
}

export function mapCategory(row: { id: string; name: string; slug: string; product_count: string | number }): Category {
  return { id: row.id, name: row.name, slug: row.slug, product_count: Number(row.product_count) };
}

export function mapReview(row: {
  id: string;
  rating: number;
  author_name: string;
  body: string;
  created_at: Date;
  status: string;
  is_demo: boolean;
}): Review {
  return {
    id: row.id,
    rating: row.rating,
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at.toISOString(),
    status: 'visible',
    is_demo: row.is_demo,
  };
}
