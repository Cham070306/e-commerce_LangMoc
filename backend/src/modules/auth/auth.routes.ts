import { Router } from 'express';
import { asyncHandler } from '../../common/async-handler.js';
import { sendData } from '../../common/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { config } from '../../config/env.js';
import {
  authenticate,
  parseLoginInput,
  parseRegisterInput,
  registerUser,
} from './auth.service.js';
import {
  clearSessionCookie,
  createSession,
  revokeSession,
  setSessionCookie,
  purgeExpiredSessions,
} from './session.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = parseRegisterInput(req.body);
    const user = await registerUser(input);
    sendData(res, user, 201);
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = parseLoginInput(req.body);
    const user = await authenticate(input.email, input.password);
    const { token, expiresAt } = await createSession(user.id, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    setSessionCookie(res, token, expiresAt);
    sendData(res, user);
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[config.sessionCookieName] as string | undefined;
    if (token) await revokeSession(token);
    clearSessionCookie(res);
    void purgeExpiredSessions().catch(() => undefined);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    sendData(res, { id: user.id, full_name: user.full_name, email: user.email, role: user.role });
  }),
);
