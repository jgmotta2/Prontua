import { Router } from 'express';
import express from 'express';
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
  updateProfileSchema,
  changePasswordSchema,
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

// POST /auth/mfa/verify — verifica OTP e emite tokens (rate-limited: 5/15min)
router.post('/mfa/verify', loginRateLimiter, authController.mfaVerify);

// POST /auth/refresh — rotaciona refresh token (JWT rotation)
router.post('/refresh', authController.refresh);

// POST /auth/logout — limpa cookies + revoga refresh
router.post('/logout', authController.logout);

// GET /auth/me — retorna identidade do usuário autenticado
router.get('/me', authRequired(), authController.me);

// POST /auth/send-verification — (re)envia código por e-mail (rate-limited: 3/h)
router.post('/send-verification', sensitiveRateLimiter, authRequired(), authController.sendVerification);

// POST /auth/verify-email — confirma o código de 6 dígitos
router.post('/verify-email', authRequired(), authController.verifyEmail);

// GET /auth/profile — perfil completo do usuário logado (inclui photo)
router.get('/profile', authRequired(), authController.profile);

// PATCH /auth/profile — atualiza campos mutáveis do perfil
router.patch('/profile', authRequired(), validate({ body: updateProfileSchema }), authController.updateProfile);

// PATCH /auth/photo — salva/remove foto de perfil (body JSON até 2 MB)
router.patch(
  '/photo',
  authRequired(),
  express.json({ limit: '2mb' }), // override do limit global para fotos
  authController.updatePhoto,
);

// PATCH /auth/change-password — troca senha (rate-limited + Zod)
router.patch(
  '/change-password',
  sensitiveRateLimiter,
  authRequired(),
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export { router as authRoutes };
