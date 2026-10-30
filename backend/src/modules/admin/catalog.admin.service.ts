import { z } from 'zod';
import type { PoolClient } from 'pg';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { AppError } from '../../common/errors.js';
import { slugify } from '../../common/slug.js';
import { mapCategory, mapProduct, type ProductRow } from '../catalog/catalog.mapper.js';
import type { Category, Product } from '../catalog/catalog.types.js';

/* ------------------------------ Categories ------------------------------ */

const categoryBase = {
  name: z.string().trim().min(1, 'Tên danh mục không được trống').max(100),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối')
    .optional(),
  parent_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
};

export const createCategorySchema = z.object(categoryBase);
export const updateCategorySchema = z.object({
  name: categoryBase.name.optional(),
  slug: categoryBase.slug,
  parent_id: categoryBase.parent_id,
  is_active: categoryBase.is_active,
});

export async function listAllCategories(): Promise<(Category & { is_active: boolean; parent_id: string | null })[]> {
  const rows = await query<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    parent_id: string | null;
    product_count: string;
  }>(
    `SELECT c.id, c.name, c.slug, c.is_active, c.parent_id,
            (SELECT count(*) FROM products p WHERE p.category_id = c.id)::text AS product_count
       FROM categories c
      ORDER BY c.name ASC`,
  );
  return rows.map((row) => ({
    ...mapCategory(row),
    is_active: row.is_active,
    parent_id: row.parent_id,
  }));
}

export async function createCategory(input: z.infer<typeof createCategorySchema>): Promise<Category> {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw AppError.validation('Không tạo được slug từ tên danh mục.', { name: 'Tên danh mục không hợp lệ.' });
  const row = await queryOne<{ id: string; name: string; slug: string; product_count: string }>(
    `INSERT INTO categories (name, slug, parent_id, is_active)
     VALUES ($1, $2, $3, COALESCE($4, true))
     RETURNING id, name, slug, '0'::text AS product_count`,
    [input.name, slug, input.parent_id ?? null, input.is_active ?? null],
  );
  if (!row) throw new Error('Không tạo được danh mục.');
  return mapCategory(row);
}

export async function updateCategory(
  id: string,
  input: z.infer<typeof updateCategorySchema>,
): Promise<Category> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.name !== undefined) {
    params.push(input.name);
    sets.push(`name = $${params.length}`);
  }
  if (input.slug !== undefined) {
    params.push(input.slug);
    sets.push(`slug = $${params.length}`);
  }
  if (input.parent_id !== undefined) {
    if (input.parent_id === id) throw AppError.validation('Danh mục không thể là cha của chính nó.');
    params.push(input.parent_id);
    sets.push(`parent_id = $${params.length}`);
  }
  if (input.is_active !== undefined) {
    params.push(input.is_active);
    sets.push(`is_active = $${params.length}`);
  }
  if (sets.length === 0) throw AppError.validation('Không có trường nào để cập nhật.');

  params.push(id);
  const row = await queryOne<{ id: string; name: string; slug: string; product_count: string }>(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, name, slug,
       (SELECT count(*) FROM products p WHERE p.category_id = categories.id)::text AS product_count`,
    params,
  );
  if (!row) throw AppError.notFound('Không tìm thấy danh mục.');
  return mapCategory(row);
}

/* ------------------------------- Products ------------------------------- */

const imageSchema = z.object({
  url: z.string().trim().min(1, 'URL ảnh không được trống').max(1000),
  alt: z.string().trim().max(255).default(''),
  sort_order: z.coerce.number().int().min(0).default(0),
  source_url: z.string().trim().max(1000).optional(),
});

const productBase = {
  name: z.string().trim().min(1, 'Tên sản phẩm không được trống').max(200),
  slug: z
    .string()
    .trim()
    .max(220)
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ gồm chữ thường, số và dấu gạch nối')
    .optional(),
  category_id: z.string().uuid('category_id không hợp lệ'),
  seller_id: z.string().uuid().nullable().optional(),
  description: z.string().max(20_000).optional(),
  material: z.string().trim().max(120).nullable().optional(),
  origin_province: z.string().trim().max(100).nullable().optional(),
  price_vnd: z.coerce.number().int('Giá phải là số nguyên').min(0, 'Giá không âm'),
  sale_price_vnd: z.coerce.number().int().min(0).nullable().optional(),
  sale_starts_at: z.coerce.date().nullable().optional(),
  sale_ends_at: z.coerce.date().nullable().optional(),
  stock_quantity: z.coerce.number().int().min(0, 'Tồn kho không âm').default(0),
  status: z.enum(['draft', 'active', 'hidden']).default('draft'),
  sku: z.string().trim().max(60).nullable().optional(),
  source_name: z.string().trim().max(160).nullable().optional(),
  source_url: z.string().trim().max(1000).nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  is_demo: z.boolean().optional(),
  price_is_demo: z.boolean().optional(),
  images: z.array(imageSchema).max(20).optional(),
};

export const createProductSchema = z
  .object(productBase)
  .superRefine((value, ctx) => {
    validateSale(value, ctx);
  });

export const updateProductSchema = z
  .object({
    ...productBase,
    name: productBase.name.optional(),
    category_id: productBase.category_id.optional(),
    price_vnd: productBase.price_vnd.optional(),
    stock_quantity: productBase.stock_quantity.optional(),
    status: productBase.status.optional(),
    images: productBase.images,
  })
  .superRefine((value, ctx) => {
    validateSale(value, ctx);
  });

function validateSale(
  value: { sale_price_vnd?: number | null; price_vnd?: number; sale_starts_at?: Date | null; sale_ends_at?: Date | null },
  ctx: z.RefinementCtx,
): void {
  // Chỉ so sánh khi cả hai cùng có trong payload; kiểm tra với giá hiện tại ở tầng service.
  if (
    value.sale_price_vnd !== undefined &&
    value.sale_price_vnd !== null &&
    value.price_vnd !== undefined &&
    value.sale_price_vnd >= value.price_vnd
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sale_price_vnd'], message: 'Giá giảm phải nhỏ hơn giá gốc.' });
  }
  if (value.sale_starts_at && value.sale_ends_at && value.sale_ends_at <= value.sale_starts_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sale_ends_at'], message: 'Thời điểm kết thúc phải sau bắt đầu.' });
  }
}

const PRODUCT_SELECT = `
  SELECT p.id, p.slug, p.name, p.category_id, c.name AS category_name,
         p.sku, p.price_vnd, p.sale_price_vnd,
         (CASE WHEN p.sale_price_vnd IS NOT NULL
                AND (p.sale_starts_at IS NULL OR p.sale_starts_at <= now())
                AND (p.sale_ends_at IS NULL OR p.sale_ends_at >= now())
               THEN p.sale_price_vnd ELSE p.price_vnd END) AS current_price_vnd,
         p.description, p.attributes, p.origin_province,
         p.source_name, p.source_url, p.collected_at,
         p.is_demo, p.price_is_demo, p.stock_quantity, p.status, p.created_at,
         COALESCE((SELECT json_agg(json_build_object('url', pi.image_url, 'alt', pi.alt_text, 'sort_order', pi.sort_order)
                                   ORDER BY pi.sort_order)
                     FROM product_images pi WHERE pi.product_id = p.id), '[]'::json) AS images
    FROM products p JOIN categories c ON c.id = p.category_id`;

export async function listAllProducts(filters: { status?: string; category_id?: string; q?: string }): Promise<Product[]> {
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  }
  if (filters.category_id) {
    params.push(filters.category_id);
    where.push(`p.category_id = $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q.toLowerCase().normalize('NFC')}%`);
    where.push(`p.search_text LIKE lower(immutable_unaccent($${params.length}))`);
  }
  const rows = await query<ProductRow>(`${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC`, params);
  return rows.map(mapProduct);
}

export async function getProductForAdmin(id: string): Promise<Product> {
  const row = await queryOne<ProductRow>(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  if (!row) throw AppError.notFound('Không tìm thấy sản phẩm.');
  return mapProduct(row);
}

async function replaceImages(client: PoolClient, productId: string, images: z.infer<typeof imageSchema>[]): Promise<void> {
  await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
  for (const [index, image] of images.entries()) {
    await client.query(
      `INSERT INTO product_images (product_id, image_url, alt_text, sort_order, source_url)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, image.url, image.alt, image.sort_order ?? index, image.source_url ?? null],
    );
  }
}

export async function createProduct(input: z.infer<typeof createProductSchema>): Promise<Product> {
  const slug = input.slug ?? slugify(input.name);
  if (!slug) throw AppError.validation('Không tạo được slug từ tên sản phẩm.');

  const category = await queryOne<{ id: string }>(`SELECT id FROM categories WHERE id = $1`, [input.category_id]);
  if (!category) throw AppError.validation('Danh mục không tồn tại.', { category_id: 'Danh mục không tồn tại.' });

  const id = await withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO products
         (seller_id, category_id, name, slug, description, material, origin_province,
          price_vnd, sale_price_vnd, sale_starts_at, sale_ends_at, stock_quantity, status,
          sku, source_name, source_url, collected_at, attributes, is_demo, price_is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now(), $17, COALESCE($18,false), COALESCE($19,false))
       RETURNING id`,
      [
        input.seller_id ?? null,
        input.category_id,
        input.name,
        slug,
        input.description ?? '',
        input.material ?? null,
        input.origin_province ?? null,
        input.price_vnd,
        input.sale_price_vnd ?? null,
        input.sale_starts_at ?? null,
        input.sale_ends_at ?? null,
        input.stock_quantity,
        input.status,
        input.sku ?? null,
        input.source_name ?? null,
        input.source_url ?? null,
        JSON.stringify(input.attributes ?? {}),
        input.is_demo ?? false,
        input.price_is_demo ?? false,
      ],
    );
    const newId = inserted.rows[0]?.id;
    if (!newId) throw new Error('Không tạo được sản phẩm.');
    if (input.images?.length) await replaceImages(client, newId, input.images);
    return newId;
  });

  return getProductForAdmin(id);
}

export async function updateProduct(
  id: string,
  input: z.infer<typeof updateProductSchema>,
): Promise<Product> {
  const existing = await queryOne<{ id: string; price_vnd: string }>(`SELECT id, price_vnd FROM products WHERE id = $1`, [id]);
  if (!existing) throw AppError.notFound('Không tìm thấy sản phẩm.');

  // Khi PATCH chỉ gửi sale_price_vnd, đối chiếu với giá gốc hiện tại trong DB.
  if (input.sale_price_vnd !== undefined && input.sale_price_vnd !== null) {
    const effectivePrice = input.price_vnd ?? Number(existing.price_vnd);
    if (input.sale_price_vnd >= effectivePrice) {
      throw AppError.validation('Dữ liệu không hợp lệ', { sale_price_vnd: 'Giá giảm phải nhỏ hơn giá gốc.' });
    }
  }

  if (input.category_id) {
    const category = await queryOne<{ id: string }>(`SELECT id FROM categories WHERE id = $1`, [input.category_id]);
    if (!category) throw AppError.validation('Danh mục không tồn tại.', { category_id: 'Danh mục không tồn tại.' });
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };

  if (input.name !== undefined) set('name', input.name);
  if (input.slug !== undefined) set('slug', input.slug);
  if (input.category_id !== undefined) set('category_id', input.category_id);
  if (input.seller_id !== undefined) set('seller_id', input.seller_id);
  if (input.description !== undefined) set('description', input.description);
  if (input.material !== undefined) set('material', input.material);
  if (input.origin_province !== undefined) set('origin_province', input.origin_province);
  if (input.price_vnd !== undefined) set('price_vnd', input.price_vnd);
  if (input.sale_price_vnd !== undefined) set('sale_price_vnd', input.sale_price_vnd);
  if (input.sale_starts_at !== undefined) set('sale_starts_at', input.sale_starts_at);
  if (input.sale_ends_at !== undefined) set('sale_ends_at', input.sale_ends_at);
  if (input.stock_quantity !== undefined) set('stock_quantity', input.stock_quantity);
  if (input.status !== undefined) set('status', input.status);
  if (input.sku !== undefined) set('sku', input.sku);
  if (input.source_name !== undefined) set('source_name', input.source_name);
  if (input.source_url !== undefined) set('source_url', input.source_url);
  if (input.attributes !== undefined) set('attributes', JSON.stringify(input.attributes));
  if (input.is_demo !== undefined) set('is_demo', input.is_demo);
  if (input.price_is_demo !== undefined) set('price_is_demo', input.price_is_demo);

  if (sets.length === 0 && !input.images) throw AppError.validation('Không có trường nào để cập nhật.');

  await withTransaction(async (client) => {
    if (sets.length > 0) {
      params.push(id);
      const result = await client.query(
        `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
        params,
      );
      if (result.rowCount === 0) throw AppError.notFound('Không tìm thấy sản phẩm.');
    }
    if (input.images) await replaceImages(client, id, input.images);
  });

  return getProductForAdmin(id);
}
