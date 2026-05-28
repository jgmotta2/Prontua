import type { Request, Response, NextFunction } from 'express';
import { getDashboardUseCase } from '@application/use-cases/dashboard/get-dashboard.use-case';

export const dashboardController = {
  async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getDashboardUseCase(req.db!);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};
