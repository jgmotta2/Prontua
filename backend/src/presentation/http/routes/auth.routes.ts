import { Router } from 'express';
import { authController } from '@presentation/http/controllers/auth.controller';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
  sensitiveRateLimiter,
} from '@presentation/http/middlewares/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
} from '@presentation/http/schemas/auth.schema';

const router = Router();

// POST /auth/register — rate-limited + validado
router.post(
  '/register',
  registerRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

// POST /auth/login — rate-limited + validado
router.post(
  '/login',
  loginRateLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

// POST /auth/refresh — renova access token usando refresh token (rotação obrigatória)
router.post('/refresh', sensitiveRateLimiter, authController.refresh);

// POST /auth/logout — revoga refresh token + limpa cookies
router.post('/logout', authController.logout);

// GET /auth/me — retorna identidade do usuário autenticado
router.get('/me', authRequired(), authController.me);

// ─── 2FA ────────────────────────────────────────────────────────────────────
router.post('/2fa/setup',    sensitiveRateLimiter, authRequired(), authController.mfaSetup);
router.post('/2fa/enable',   sensitiveRateLimiter, authRequired(), authController.mfaEnable);
router.post('/2fa/disable',  sensitiveRateLimiter, authRequired(), authController.mfaDisable);
router.post('/2fa/send-otp', sensitiveRateLimiter, authController.mfaSendOtp);
router.post('/2fa/verify',   sensitiveRateLimiter, authController.mfaVerify);

export { router as authRoutes };
