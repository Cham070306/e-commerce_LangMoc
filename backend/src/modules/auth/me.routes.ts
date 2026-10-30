import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/async-handler.js';
import { sendData, sendList } from '../../common/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { addressSchema, createAddress, deleteAddress, listAddresses } from '../addresses/addresses.service.js';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get(
  '/addresses',
  asyncHandler(async (req, res) => {
    const addresses = await listAddresses(req.user!.id);
    sendList(res, addresses, { page: 1, limit: addresses.length || 1, total: addresses.length });
  }),
);

meRouter.post(
  '/addresses',
  asyncHandler(async (req, res) => {
    const input = addressSchema.parse(req.body ?? {});
    const address = await createAddress(req.user!.id, input);
    sendData(res, address, 201);
  }),
);

const idParam = z.object({ id: z.string().uuid('Mã địa chỉ không hợp lệ') });

meRouter.delete(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    await deleteAddress(req.user!.id, id);
    res.status(204).end();
  }),
);
