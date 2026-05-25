# syntax=docker/dockerfile:1.7
# ============================================================================
# Sereno Backend — multi-stage build
# ----------------------------------------------------------------------------
# Stage 1 (deps):  instala TODAS as deps + gera Prisma client
# Stage 2 (build): compila TypeScript -> dist/
# Stage 3 (prod):  imagem final mínima com apenas o necessário pra runtime
# ============================================================================

ARG NODE_VERSION=20-alpine

# ─── Stage 1: dependências ──────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# openssl: requerido pelo Prisma engine no Alpine (musl)
# tini:    init system pra forward correto de SIGTERM (graceful shutdown)
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --include=dev

# ─── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: produção ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS prod
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat tini wget
ENV NODE_ENV=production \
    PORT=4000

# Usuário não-root pra reduzir blast radius em caso de RCE
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs sereno

# Instala apenas deps de produção + gera o Prisma client
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# Copia o código já compilado
COPY --from=build --chown=sereno:nodejs /app/dist ./dist

USER sereno
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Em deploy real: rodar migrations antes:
#   CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
CMD ["node", "dist/main.js"]
