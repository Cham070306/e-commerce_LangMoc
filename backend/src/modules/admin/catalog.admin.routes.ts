import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { sendData, sendList } from '../../common/http.js';
import { requireAdmin } from '../../middleware/auth.js';
import {
  createCategory,
  createCategorySchema,
  createProduct,
  createProductSchema,
  getProductForAdmin,
  listAllCategories,
  listAllProducts,
  updateCategory,
  updateCategorySchema,
  updateProduct,
  updateProductSchema,
} from './catalog.admin.service.js';

export const adminCatalogRouter = Router();

adminCatalogRouter.use(requireAdmin);

adminCatalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await listAllCategories();
    sendList(res, categories, { page: 1, limit: categories.length || 1, total: categories.length });
  }),
);

adminCatalogRouter.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const input = createCategorySchema.parse(req.body ?? {});
    sendData(res, await createCategory(input), 201);
  }),
);

adminCatalogRouter.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const input = updateCategorySchema.parse(req.body ?? {});
    sendData(res, await updateCategory(req.params.id!, input));
  }),
);

adminCatalogRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const products = await listAllProducts({ status, category_id: categoryId, q });
    sendList(res, products, { page: 1, limit: products.length || 1, total: products.length });
  }),
);

adminCatalogRouter.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    sendData(res, await getProductForAdmin(req.params.id!));
  }),
);

adminCatalogRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body ?? {});
    sendData(res, await createProduct(input), 201);
  }),
);

adminCatalogRouter.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const input = updateProductSchema.parse(req.body ?? {});
    sendData(res, await updateProduct(req.params.id!, input));
  }),
);
