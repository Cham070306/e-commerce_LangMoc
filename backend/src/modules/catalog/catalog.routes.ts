import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { sendData, sendList } from '../../common/http.js';
import { AppError } from '../../common/errors.js';
import {
  getActiveProductBySlugOrId,
  listCategories,
  listProductReviews,
  listProducts,
  parseProductFilters,
} from './catalog.service.js';

export const catalogRouter = Router();

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await listCategories();
    sendList(res, categories, { page: 1, limit: categories.length || 1, total: categories.length });
  }),
);

catalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const filters = parseProductFilters(req.query as Record<string, unknown>);
    const { data, total } = await listProducts(filters);
    sendList(res, data, { page: filters.page, limit: filters.limit, total });
  }),
);

const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(5),
});

catalogRouter.get(
  '/products/:slug/reviews',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    if (!slug) throw AppError.notFound('Không tìm thấy sản phẩm.');
    const product = await getActiveProductBySlugOrId(slug);
    if (!product) throw AppError.notFound('Không tìm thấy sản phẩm.');

    const parsed = reviewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.validation('Phân trang đánh giá không hợp lệ.');
    }
    const { page, limit } = parsed.data;
    const { data, total, average } = await listProductReviews(product.id, { page, limit });
    sendList(res, data, { page, limit, total }, { summary: { average_rating: average, review_count: total } });
  }),
);

catalogRouter.get(
  '/products/:slug',
  asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    if (!slug) throw AppError.notFound('Không tìm thấy sản phẩm.');
    const product = await getActiveProductBySlugOrId(slug);
    if (!product) throw AppError.notFound('Không tìm thấy sản phẩm.');
    sendData(res, product);
  }),
);
