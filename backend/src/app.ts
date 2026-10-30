import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config/env.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './common/async-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/auth/me.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { adminCatalogRouter } from './modules/admin/catalog.admin.routes.js';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(attachUser);

  app.get('/api/v1/health', (_req, res) => {
    res.json({ data: { status: 'ok', service: 'lang-moc-backend' } });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/me', meRouter);
  app.use('/api/v1/admin', adminCatalogRouter);
  app.use('/api/v1', catalogRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
