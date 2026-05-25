import { buildServer } from '@presentation/http/server';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';
import { prisma } from '@config/prisma';

async function bootstrap(): Promise<void> {
  const app = buildServer();

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `Prontua API ouvindo em http://localhost:${env.PORT}`,
    );
  });

  // Graceful shutdown — drena conexões, fecha pool do Prisma.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown_initiated');

    server.close((err) => {
      if (err) logger.error({ err }, 'http_close_error');
    });

    try {
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, 'prisma_disconnect_error');
    }

    // Dá um tempo para in-flight requests terminarem antes de matar.
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled_rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught_exception');
    void shutdown('uncaughtException');
  });
}

void bootstrap();
