import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authRequired } from '@presentation/http/middlewares/auth.middleware';
import { tenantContext } from '@presentation/http/middlewares/tenant.middleware';
import { requireClinicalAccess } from '@presentation/http/middlewares/rbac.middleware';

const router = Router();
router.use(authRequired(), tenantContext(), requireClinicalAccess);

// GET /search?q=termo — busca pacientes + sessões próximas
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = String(req.query['q'] ?? '').trim();
    if (q.length < 2) {
      res.json({ patients: [], sessions: [] });
      return;
    }

    const [patients, sessions] = await Promise.all([
      req.db!.patient.findMany({
        where: {
          deletedAt: null,
          fullName: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, fullName: true, whatsapp: true, email: true, frequencyTag: true, sessionValue: true },
        take: 6,
        orderBy: { fullName: 'asc' },
      }),
      req.db!.session.findMany({
        where: {
          deletedAt: null,
          patient: { fullName: { contains: q, mode: 'insensitive' } },
          scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          patient: { select: { id: true, fullName: true } },
        },
        take: 4,
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);

    res.json({
      patients: patients.map((p) => ({ ...p, sessionValue: Number(p.sessionValue) })),
      sessions: sessions.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        status: s.status,
        patientId: s.patient.id,
        patientName: s.patient.fullName,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export { router as searchRoutes };
