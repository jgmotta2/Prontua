# ── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY prontua-mvp/frontend/package*.json ./
RUN npm ci

COPY prontua-mvp/frontend ./
RUN npm run build

# ── Stage 2: Build backend ──────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /backend

COPY prontua-mvp/backend/package*.json ./
RUN npm ci

COPY prontua-mvp/backend ./
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Backend compilado
COPY --from=backend-builder /backend/dist          ./dist
COPY --from=backend-builder /backend/node_modules  ./node_modules
COPY --from=backend-builder /backend/prisma        ./prisma
COPY --from=backend-builder /backend/package.json  ./

# Frontend compilado — servido pelo Express em /api-less routes
COPY --from=frontend-builder /frontend/dist        ./public

EXPOSE 4000

# Roda migrações pendentes e inicia a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
