import { promises as fs } from 'node:fs';
import path from 'node:path';
import cron from 'node-cron';
import { prisma } from '@config/prisma';
import { logger } from '@shared/utils/logger';
import { emailService } from '@infrastructure/messaging/email.service';
import { env } from '@config/env';

/**
 * Registra todos os cron jobs do sistema.
 * Chamado uma vez no bootstrap (main.ts).
 */
export function startCronJobs(): void {
  // ── 1. Expirar refresh tokens antigos (diariamente às 2h) ─────────────────
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count } = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { createdAt: { lt: thirtyDaysAgo }, revokedAt: null },
          ],
        },
      });
      if (count > 0) logger.info({ count }, 'cron:expired_tokens_purged');
    } catch (err) {
      logger.error({ err }, 'cron:token_expiry_failed');
    }
  });

  // ── 2. Relatório mensal por e-mail (dia 1 de cada mês às 8h) ──────────────
  cron.schedule('0 8 1 * *', async () => {
    try {
      const now = new Date();
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthLabel = firstOfLastMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      const tenants = await prisma.tenant.findMany({
        where: { active: true },
        include: {
          users: {
            where: { role: 'OWNER', active: true },
            select: { email: true, name: true, id: true },
          },
        },
      });

      for (const tenant of tenants) {
        const owner = tenant.users[0];
        if (!owner) continue;

        const [sessions, revenue, pending, newPatients] = await Promise.all([
          prisma.session.count({
            where: {
              tenantId: tenant.id,
              status: 'COMPLETED',
              scheduledAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
            },
          }),
          prisma.payment.aggregate({
            where: {
              tenantId: tenant.id,
              status: 'PAID',
              paidAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
            },
            _sum: { amount: true },
          }),
          prisma.payment.aggregate({
            where: { tenantId: tenant.id, status: 'PENDING' },
            _sum: { amount: true },
          }),
          prisma.patient.count({
            where: {
              tenantId: tenant.id,
              deletedAt: null,
              createdAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
            },
          }),
        ]);

        await emailService.sendMonthlyReport(owner.email, owner.name, {
          month: monthLabel,
          sessions,
          revenue: Number(revenue._sum.amount ?? 0),
          pendingRevenue: Number(pending._sum.amount ?? 0),
          newPatients,
        });
      }

      logger.info({ tenants: tenants.length, month: monthLabel }, 'cron:monthly_reports_sent');
    } catch (err) {
      logger.error({ err }, 'cron:monthly_report_failed');
    }
  });

  // ── 3. Backup local do banco SQLite (diariamente às 3h) ───────────────────
  cron.schedule('0 3 * * *', async () => {
    try {
      const rawUrl = env.DATABASE_URL.replace(/^file:/, '');
      const dbPath = path.isAbsolute(rawUrl) ? rawUrl : path.resolve(process.cwd(), rawUrl);
      const backupsDir = path.join(path.dirname(dbPath), 'backups');

      await fs.mkdir(backupsDir, { recursive: true });

      const dateTag = new Date().toISOString().slice(0, 10);
      const backupPath = path.join(backupsDir, `db-backup-${dateTag}.db`);
      await fs.copyFile(dbPath, backupPath);

      // Mantém os últimos 7 backups
      const files = (await fs.readdir(backupsDir))
        .filter((f) => f.startsWith('db-backup-') && f.endsWith('.db'))
        .sort();
      for (const old of files.slice(0, -7)) {
        await fs.unlink(path.join(backupsDir, old)).catch(() => {});
      }

      logger.info({ backupPath }, 'cron:db_backup_done');
    } catch (err) {
      logger.error({ err }, 'cron:db_backup_failed');
    }
  });

  logger.info('cron:all_jobs_registered');
}
