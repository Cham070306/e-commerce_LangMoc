import { z } from 'zod';
import { query, queryOne } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';
import { mapCategory, mapProduct, mapReview, type ProductRow } from './catalog.mapper.js';
import type { Category, ProductFilters, Product, Review, ProductSort } from './catalog.types.js';

export const SORT_VALUES: readonly ProductSort[] = ['newest', 'price_asc', 'price_desc', 'name_asc'];

const filtersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category_id: z.string().uuid('category_id không hợp lệ').optional(),
  category: z.string().trim().max(120).optional(),
  min_price: z.coerce.number().int('Giá tối thiểu phải là số nguyên').min(0, 'Giá tối thiểu không âm').optional(),
  max_price: z.coerce.number().int('Giá tối đa phải là số nguyên').min(0, 'Giá tối đa không âm').optional(),
  sort: z.enum(SORT_VALUES as [ProductSort, ...ProductSort[]]).default('newest'),
  page: z.coerce.number().int().min(1, 'Trang phải >= 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Tối đa 100 dòng/trang').default(12),
});

/** Chuẩn hóa & kiểm tra filter từ query string. */
export function parseProductFilters(raw: Record<string, unknown>): ProductFilters {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === '' || value === undefined || value === null || value === '_demo') continue;
    cleaned[key] = value;
  }
  const parsed = filtersSchema.safeParse(cleaned);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    throw AppError.validation('Bộ lọc không hợp lệ.', fields);
  }
  const f = parsed.data;
  if (f.min_price !== undefined && f.max_price !== undefined && f.min_price > f.max_price) {
    throw AppError.validation('Khoảng giá không hợp lệ.', { max_price: 'Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.' });
  }
  return f;
}

const ORDER_BY: Record<ProductSort, string> = {
  newest: 'p.created_at DESC',
  price_asc: 'current_price_sort ASC NULLS LAST',
  price_desc: 'current_price_sort DESC NULLS LAST',
  name_asc: 'p.name ASC',
};

// Giá đang áp dụng (đã xét thời gian khuyến mại) — dùng chung cho chọn cột và lọc.
export const CURRENT_PRICE_EXPR = `CASE
  WHEN p.sale_price_vnd IS NOT NULL
   AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= now())
   AND (p.sale_ends_at IS NULL OR p.sale_ends_at >= now())
  THEN p.sale_price_vnd ELSE p.price_vnd END`;

// Biểu thức giá để sắp xếp: NULL khi sản phẩm không có giá.
const CURRENT_PRICE_SORT_EXPR = `CASE WHEN p.price_vnd IS NULL THEN NULL ELSE (${CURRENT_PRICE_EXPR}) END`;

function isPriceSort(sort: ProductSort): boolean {
  return sort === 'price_asc' || sort === 'price_desc';
}

function selectProductSql(extraImagesJoin = true): string {
  return `
    SELECT p.id, p.slug, p.name, p.category_id,
           c.name AS category_name,
           p.sku, p.price_vnd, p.sale_price_vnd,
           (${CURRENT_PRICE_EXPR}) AS current_price_vnd,
           p.description, p.attributes, p.origin_province,
           p.source_name, p.source_url, p.collected_at,
           p.is_demo, p.price_is_demo, p.stock_quantity, p.status, p.created_at,
           CASE WHEN p.price_vnd IS NULL THEN NULL ELSE (${CURRENT_PRICE_EXPR}) END AS current_price_sort,
           ${
             extraImagesJoin
               ? `COALESCE(
                    (SELECT json_agg(json_build_object('url', pi.image_url, 'alt', pi.alt_text, 'sort_order', pi.sort_order)
                                     ORDER BY pi.sort_order)
                       FROM product_images pi WHERE pi.product_id = p.id),
                    '[]'::json
                  ) AS images`
               : `'[]'::json AS images`
           }
      FROM products p
      JOIN categories c ON c.id = p.category_id
  `;
}

export async function listCategories(onlyActive = true): Promise<Category[]> {
  const rows = await query<{ id: string; name: string; slug: string; product_count: string }>(
    `SELECT c.id, c.name, c.slug,
            (SELECT count(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active')::text AS product_count
       FROM categories c
      ${onlyActive ? 'WHERE c.is_active = true' : ''}
      ORDER BY c.name ASC`,
  );
  return rows.map(mapCategory);
}

export async function listProducts(filters: ProductFilters): Promise<{ data: Product[]; total: number }> {
  const where: string[] = [`p.status = 'active'`];
  const params: unknown[] = [];

  if (filters.category_id) {
    params.push(filters.category_id);
    where.push(`p.category_id = $${params.length}`);
  } else if (filters.category) {
    params.push(filters.category);
    where.push(`c.slug = $${params.length}`);
  }

  if (filters.q) {
    // search_text là cột generated đã bỏ dấu + lowercase; chuẩn hóa từ khóa tương ứng.
    params.push(`%${filters.q.toLowerCase().normalize('NFC')}%`);
    where.push(`p.search_text LIKE lower(immutable_unaccent($${params.length}))`);
  }

  if (filters.min_price !== undefined) {
    params.push(filters.min_price);
    where.push(`p.price_vnd IS NOT NULL AND (${CURRENT_PRICE_EXPR}) >= $${params.length}`);
  }
  if (filters.max_price !== undefined) {
    params.push(filters.max_price);
    where.push(`p.price_vnd IS NOT NULL AND (${CURRENT_PRICE_EXPR}) <= $${params.length}`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRow = await queryOne<{ total: string }>(
    `SELECT count(*)::text AS total FROM products p JOIN categories c ON c.id = p.category_id ${whereSql}`,
    params,
  );
  const total = Number(countRow?.total ?? 0);

  const orderBy = isPriceSort(filters.sort) ? ORDER_BY[filters.sort] : ORDER_BY[filters.sort];
  params.push(filters.limit, (filters.page - 1) * filters.limit);

  const rows = await query<ProductRow>(
    `${selectProductSql()}
     ${whereSql}
     ORDER BY ${orderBy}, p.id ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { data: rows.map(mapProduct), total };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(
    `${selectProductSql()}
      WHERE p.slug = $1 AND p.status = 'active'`,
    [slug],
  );
  return row ? mapProduct(row) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const row = await queryOne<ProductRow>(
    `${selectProductSql()}
      WHERE p.id = $1 AND p.status = 'active'`,
    [id],
  );
  return row ? mapProduct(row) : null;
}

export async function getActiveProductBySlugOrId(identifier: string): Promise<Product | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  return isUuid ? getProductById(identifier) : getProductBySlug(identifier);
}

export interface ReviewQuery {
  page: number;
  limit: number;
}

export async function listProductReviews(
  productId: string,
  { page, limit }: ReviewQuery,
): Promise<{ data: Review[]; total: number; average: number | null }> {
  const countRow = await queryOne<{ total: string; avg: string | null }>(
    `SELECT count(*)::text AS total, avg(rating)::text AS avg
       FROM reviews WHERE product_id = $1 AND status = 'visible'`,
    [productId],
  );
  const total = Number(countRow?.total ?? 0);
  const average = countRow?.avg === null || countRow?.avg === undefined ? null : Number(Number(countRow.avg).toFixed(2));

  const rows = await query<{
    id: string;
    rating: number;
    author_name: string;
    body: string;
    created_at: Date;
    status: string;
    is_demo: boolean;
  }>(
    `SELECT r.id, r.rating, u.full_name AS author_name, r.comment AS body,
            r.created_at, r.status, false AS is_demo
       FROM reviews r
       JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1 AND r.status = 'visible'
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
    [productId, limit, (page - 1) * limit],
  );

  return { data: rows.map(mapReview), total, average };
}

export { CURRENT_PRICE_SORT_EXPR };
