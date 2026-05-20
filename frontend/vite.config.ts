import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@':           path.resolve(__dirname, 'src'),
        '@app':        path.resolve(__dirname, 'src/app'),
        '@features':   path.resolve(__dirname, 'src/features'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@hooks':      path.resolve(__dirname, 'src/hooks'),
        '@lib':        path.resolve(__dirname, 'src/lib'),
        '@types':      path.resolve(__dirname, 'src/types'),
      },
    },
    server: {
      port: 5173,
      // Em dev, proxy /api -> backend para que o cookie HttpOnly funcione
      // como mesma origem (sem complicação de SameSite cross-site).
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
          cookieDomainRewrite: 'localhost',
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  };
});
