import type { Request, Response, NextFunction } from 'express';
import { getDashboardUseCase, type DashboardData } from '@application/use-cases/dashboard/get-dashboard.use-case';

const cache = new Map<string, { data: DashboardData; expires: number }>();
const CACHE_TTL_MS = 30_000;

export const dashboardController = {
  async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.auth!.tenantId;
      const cached = cache.get(tenantId);
      if (cached && cached.expires > Date.now()) {
        res.json(cached.data);
        return;
      }
      const data = await getDashboardUseCase(req.db!);
      cache.set(tenantId, { data, expires: Date.now() + CACHE_TTL_MS });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};
