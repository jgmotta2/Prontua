import { Router } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { validate } from '@presentation/http/middlewares/validation.middleware';
import { sensitiveRateLimiter } from '@presentation/http/middlewares/rate-limit.middleware';
import {
  updateUserSchema,
  changePasswordSchema,
} from '@presentation/http/schemas/clinical.schema';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/prisma';
import { passwordService } from '@infrastructure/crypto/password.service';
import { UnauthorizedError, NotFoundError } from '@shared/errors/app-error';

const router = Router();

router.use(authRequired());

// GET /users/me — perfil completo do usuário autenticado
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.sub },
      select: {
        id: true,
        email: true,
        name: true,
        whatsapp: true,
        city: true,
        state: true,
        specialty: true,
        registry: true,
        role: true,
        mfaEnabled: true,
        mfaMethod: true,
        tenantId: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundError('Usuário');
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/me — atualiza dados do perfil
router.patch(
  '/me',
  validate({ body: updateUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as any;

      const user = await prisma.user.update({
        where: { id: req.auth!.sub },
        data:  {
          name:      body.name,
          whatsapp:  body.whatsapp,
          city:      body.city,
          state:     body.state,
          specialty: body.specialty,
          registry:  body.registry,
        },
        select: {
          id: true, email: true, name: true, whatsapp: true,
          city: true, state: true, specialty: true, registry: true, role: true,
        },
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// POST /users/me/change-password
router.post(
  '/me/change-password',
  sensitiveRateLimiter,
  validate({ body: changePasswordSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as any;

      const user = await prisma.user.findUnique({
        where: { id: req.auth!.sub },
        select: { passwordHash: true },
      });

      if (!user) throw new NotFoundError('Usuário');

      const { valid } = await passwordService.verify(user.passwordHash, body.currentPassword as string);
      if (!valid) throw new UnauthorizedError('Senha atual incorreta');

      const newHash = await passwordService.hash(body.newPassword as string);

      await prisma.user.update({
        where: { id: req.auth!.sub },
        data:  { passwordHash: newHash, passwordChangedAt: new Date() },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as userRoutes };
