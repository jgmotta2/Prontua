# syntax=docker/dockerfile:1.7
# ============================================================================
# Sereno Frontend — build estático com Vite, servido por Nginx
# ----------------------------------------------------------------------------
# VITE_API_BASE_URL é resolvido em BUILD-TIME (não em runtime), então
# precisa ser passado como --build-arg:
#   docker build --build-arg VITE_API_BASE_URL=https://api.sereno.health .
# ============================================================================

# ─── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build-time env var. Default '/api' funciona quando frontend e backend
# compartilham domínio com reverse proxy roteando /api -> backend.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ─── Stage 2: nginx ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS prod

# Remove configuração default e usa a nossa
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
