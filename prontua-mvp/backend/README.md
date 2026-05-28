# Sereno — Backend

API Node.js + TypeScript + Prisma + PostgreSQL para o SaaS Sereno.

Arquitetura em camadas (Clean Architecture simplificado):

```
src/
├── config/          # bootstrap, env, prisma client
├── domain/          # entidades e contratos de repositório (regra de negócio pura)
├── application/     # use cases — orquestram domínio + infra
├── infrastructure/  # implementações concretas (Prisma, crypto, Z-API)
├── presentation/    # HTTP (routes, controllers, middlewares, schemas Zod)
└── shared/          # errors, logger, types
```

## Setup local

### 1. Pré-requisitos

- Node.js >= 20
- Docker (para Postgres + PgBouncer + Redis) **ou** instalação local
- pnpm/npm

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```

Gere os segredos obrigatórios:

```bash
# JWT (64 bytes, dois segredos diferentes)
openssl rand -base64 64
openssl rand -base64 64

# Master key de criptografia (EXATAMENTE 32 bytes — AES-256)
openssl rand -base64 32

# Pepper para hashes determinísticos
openssl rand -base64 32
```

Cole cada um em `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`ENCRYPTION_MASTER_KEY` e `HASH_PEPPER` respectivamente.

> ⚠️ Em produção, **NUNCA** mantenha esses segredos em `.env`. Use AWS Secrets
> Manager, GCP Secret Manager ou HashiCorp Vault. A `ENCRYPTION_MASTER_KEY`
> deve idealmente residir em um KMS com envelope encryption — o app pega
> apenas DEKs de curto prazo.

### 3. Banco e migrations

```bash
npm install
npm run prisma:generate
npm run prisma:migrate      # cria DB e aplica migrations
```

Para acessar GUI:

```bash
npm run prisma:studio
```

### 4. Rodar em dev

```bash
npm run dev      # tsx watch
```

API sobe em `http://localhost:4000`. Healthcheck: `GET /health`.

## Endpoints implementados (MVP)

| Método | Rota                | Middlewares                                            |
|--------|---------------------|--------------------------------------------------------|
| POST   | `/auth/register`    | rate-limit (3/h), validate                             |
| POST   | `/auth/login`       | rate-limit (5/15min), validate                         |
| POST   | `/auth/logout`      | —                                                      |
| GET    | `/auth/me`          | authRequired                                           |
| GET    | `/patients`         | auth, tenant, requireClinicalAccess                    |
| GET    | `/patients/:id`     | auth, tenant, requireClinicalAccess, audit             |
| POST   | `/patients`         | auth, tenant, requireClinicalAccess, validate, audit   |
| DELETE | `/patients/:id`     | + sensitiveRateLimiter (10/h)                          |

A criar (próximos sprints): `/sessions`, `/notes`, `/payments`,
`/dashboard`, `/whatsapp`, `/lgpd/export`.

## Defesas de segurança ativas (OWASP Top 10 → controles)

| OWASP                              | Mecanismo                                                              |
|------------------------------------|------------------------------------------------------------------------|
| A01 Broken Access Control          | RBAC + multi-tenant isolation no Prisma Client estendido (`forTenant`) |
| A02 Cryptographic Failures         | AES-256-GCM em prontuário; Argon2id em senha; TLS 1.3                 |
| A03 Injection                      | Prisma parametrizado + Zod com `.strict()` (anti mass assignment)     |
| A04 Insecure Design                | Use cases isolam regra; refresh token com rotation family             |
| A05 Security Misconfiguration      | Helmet, CSP estrito, env validado com fail-fast                       |
| A06 Vulnerable Components          | `npm audit` em CI; lockfile commitado                                  |
| A07 Identification & Auth Failures | Argon2id, lockout 10 tentativas, timing-equalization no login         |
| A08 Software & Data Integrity      | Lockfile, integridade via auth tag GCM                                |
| A09 Logging & Monitoring Failures  | Audit log append-only, redact list no logger, IP hashed               |
| A10 SSRF                           | Z-API com URL whitelist; sem fetch dinâmico                           |

## Geração de chave para rotação

Para rotacionar `ENCRYPTION_MASTER_KEY`:

1. Gere a nova chave: `openssl rand -base64 32`
2. Incremente `ENCRYPTION_KEY_VERSION` no env
3. Mantenha a chave anterior em `ENCRYPTION_MASTER_KEY_V<n>` no env
4. Rode o job de rotação que chama `encryptionService.rotate()` em batches

## Scripts

| Comando                | Ação                                          |
|------------------------|-----------------------------------------------|
| `npm run dev`          | tsx watch (hot reload)                        |
| `npm run build`        | tsc + tsc-alias (resolve paths)               |
| `npm run start`        | node dist/main.js                             |
| `npm run prisma:migrate`     | cria/aplica migrations em dev          |
| `npm run prisma:migrate:prod`| aplica migrations em produção          |
| `npm run prisma:studio`      | GUI de inspeção                        |
| `npm run lint`         | ESLint                                        |
| `npm run format`       | Prettier                                      |
| `npm run test`         | Vitest                                        |
