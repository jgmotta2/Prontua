import { Router } from 'express';
import { authController } from '@presentation/http/controllers/auth.controller';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
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

// POST /auth/logout — limpa cookies + revoga refresh
router.post('/logout', authController.logout);

// GET /auth/me — retorna identidade do usuário autenticado
router.get('/me', authRequired(), authController.me);

// POST /auth/send-verification — (re)envia código por e-mail
router.post('/send-verification', authRequired(), authController.sendVerification);

// POST /auth/verify-email — confirma o código de 6 dígitos
router.post('/verify-email', authRequired(), authController.verifyEmail);

export { router as authRoutes };
