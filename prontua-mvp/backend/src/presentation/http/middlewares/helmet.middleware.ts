import helmet from 'helmet';
import { env } from '@config/env';

/**
 * Headers HTTP de segurança (OWASP). Inclui:
 *  - Content-Security-Policy (mitigação principal contra XSS)
 *  - Strict-Transport-Security (força HTTPS)
 *  - X-Content-Type-Options: nosniff
 *  - X-Frame-Options: DENY (anti-clickjacking)
 *  - Referrer-Policy: no-referrer
 *  - Cross-Origin-Resource-Policy: same-site
 *  - Remove X-Powered-By
 */
export const permissionsPolicyMiddleware = (_req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)',
  );
  next();
};

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind exige inline em alguns casos
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...env.CORS_ORIGINS],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // pode quebrar embeds; ativar se necessário
  crossOriginResourcePolicy: { policy: 'same-site' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  hsts: {
    maxAge: 31_536_000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'deny' },
  noSniff: true,
  // xssFilter e hidePoweredBy removidos: deprecated/no-op no Helmet v8
});
