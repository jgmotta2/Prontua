# Sereno

SaaS B2B para clínicas de saúde mental e multiprofissionais (psicologia,
fisioterapia, fonoaudiologia, psicopedagogia), com **Privacy by Design**
e conformidade com **LGPD** e **Código de Ética do CFP**.

> Para entender as decisões técnicas em detalhe, leia `ARCHITECTURE.md`.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + RHF + Zod + TanStack Query
- **Backend**: Node.js 20 + TypeScript + Express + Prisma + Zod
- **Banco**: PostgreSQL 16 (+ extensões `pgcrypto` e `citext`)
- **Cache / Rate limit**: Redis
- **Mensageria**: Z-API (WhatsApp — só administrativo)
- **Criptografia**: AES-256-GCM em prontuário + Argon2id em senhas
- **Auth**: JWT em cookie HttpOnly + Secure + SameSite=Strict

## Estrutura

```
sereno/
├── ARCHITECTURE.md          # decisões técnicas e modelo de ameaças
├── docker-compose.yml       # infra dev (postgres + redis)
├── docker-compose.full.yml  # stack inteira em containers (valida prod local)
│
├── backend/                 # API Node.js + TypeScript
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/           # env, prisma client com tenant isolation
│       ├── application/      # use cases (regra de negócio)
│       ├── infrastructure/   # crypto, messaging, audit, repositórios
│       ├── presentation/     # HTTP: routes, controllers, middlewares
│       └── shared/           # errors, logger, types
│
└── frontend/                # SPA React + TypeScript
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── app/              # providers, rotas
        ├── components/       # UI compartilhada (Sidebar, BottomNav, AppShell)
        ├── features/         # feature folders (auth, dashboard, ...)
        └── lib/              # api client, validation, utils
```

---

## Dev local (caminho mais rápido)

### 1. Pré-requisitos

- **Node.js 20+** (`node -v`)
- **Docker Desktop** (ou `docker` + `docker compose`)
- **npm** ou pnpm

### 2. Subir infra (Postgres + Redis)

```bash
docker compose up -d
```

### 3. Backend

```bash
cd backend
cp .env.example .env
```

Gere os 4 segredos obrigatórios e cole no `.env`:

```bash
openssl rand -base64 64    # JWT_ACCESS_SECRET
openssl rand -base64 64    # JWT_REFRESH_SECRET
openssl rand -base64 32    # ENCRYPTION_MASTER_KEY  (exatamente 32 bytes!)
openssl rand -base64 32    # HASH_PEPPER
```

Mantenha `DATABASE_URL=postgresql://sereno:sereno_dev_only@localhost:5432/sereno`
e `DIRECT_URL` igual (para dev, sem PgBouncer).

```bash
npm install
npm run prisma:migrate -- --name init      # cria schema no banco
npm run dev                                 # API em http://localhost:4000
```

### 4. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # app em http://localhost:5173
```

Pronto. Abre `http://localhost:5173`, cria conta, cai no dashboard.

---

## Testar build de produção localmente

Antes de fazer deploy, valide a imagem de produção rodando o stack
inteiro em containers:

```bash
docker compose -f docker-compose.full.yml up --build
```

- API:      `http://localhost:4000`
- Frontend: `http://localhost:8080`

As migrations rodam automaticamente no startup do container backend
(`prisma migrate deploy`).

---

## Deploy em produção

Você tem três caminhos principais. Recomendo **Railway** se quer subir
mais rápido com menor fricção.

### Opção A — Railway (recomendado para começar)

[Railway](https://railway.app) tem Postgres + Redis gerenciados e
detecta Docker automaticamente. Custo inicial ~USD 5/mês.

1. **Crie 4 serviços no Railway:**
   - PostgreSQL (botão "+ New" → Database → PostgreSQL)
   - Redis (idem → Redis)
   - Backend (idem → Empty Service → conecte ao GitHub do repositório, root path `/backend`)
   - Frontend (idem → root path `/frontend`)

2. **Variáveis de ambiente do backend** (cole todas as do `.env.example`):
   - `DATABASE_URL`: use o `${{Postgres.DATABASE_URL}}` do Railway
   - `DIRECT_URL`: idem (Railway não tem PgBouncer separado por padrão)
   - `REDIS_URL`: use `${{Redis.REDIS_URL}}`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_MASTER_KEY`,
     `HASH_PEPPER`: gere localmente com `openssl rand -base64 …` e cole
   - `CORS_ORIGINS`: o domínio público do frontend (Railway gera um;
     ou seu domínio próprio)
   - `FRONTEND_URL`: idem
   - `COOKIE_DOMAIN`: deixe vazio (Railway gera `*.up.railway.app`)
     ou configure seu domínio (ex: `.sereno.health`)
   - `TRUST_PROXY`: `1`
   - `NODE_ENV`: `production`
   - `ZAPI_*`: do seu painel Z-API

3. **Comando de start do backend** (Settings → Deploy):
   ```
   sh -c "npx prisma migrate deploy && node dist/main.js"
   ```

4. **Variável de build do frontend** (Settings → Variables → Build):
   - `VITE_API_BASE_URL`: URL pública do backend (ex: `https://sereno-api.up.railway.app`)

5. **Domínio próprio**: Settings → Networking → Custom Domain.
   Aponte um CNAME do seu DNS para o domínio do Railway. HTTPS é
   automático via Let's Encrypt.

### Opção B — Fly.io

[Fly.io](https://fly.io) também é ótimo, com mais controle e free tier
generoso. Pré-requisito: instalar `flyctl`.

```bash
# Backend
cd backend
fly launch --no-deploy
# (responda perguntas; vai gerar fly.toml)
fly secrets set JWT_ACCESS_SECRET=... ENCRYPTION_MASTER_KEY=...  # etc.
fly postgres create
fly postgres attach <db-name>
fly redis create
fly deploy
```

Repita pra `frontend/`.

### Opção C — Docker em VPS (DigitalOcean, Hetzner, etc.)

Para self-hosting completo:

```bash
# Na VPS
git clone <repo>
cd sereno
cp backend/.env.example backend/.env
# preencha os segredos

docker compose -f docker-compose.full.yml up -d --build
```

Coloque um **Caddy** ou **Nginx** na frente como reverse proxy + TLS:

```caddy
# /etc/caddy/Caddyfile
api.sereno.health {
    reverse_proxy localhost:4000
}
app.sereno.health {
    reverse_proxy localhost:8080
}
```

Caddy resolve TLS automaticamente via Let's Encrypt.

---

## Provedores recomendados de serviços gerenciados

Mesmo usando Railway/Fly/VPS, você pode (e em escala deveria) usar
serviços dedicados:

| Recurso          | Provedor recomendado                  | Plano free       |
|------------------|---------------------------------------|------------------|
| PostgreSQL       | [Supabase](https://supabase.com) ou [Neon](https://neon.tech) | Sim |
| Redis            | [Upstash](https://upstash.com)        | Sim (10k cmd/dia)|
| Object storage   | Cloudflare R2 ou AWS S3               | Sim (R2)         |
| Email transacional| [Resend](https://resend.com)         | 3k/mês           |
| Erros / APM      | [Sentry](https://sentry.io)           | Sim              |

Coloque as URLs no `.env` do backend. Pronto.

---

## Checklist pré-deploy

Antes de apontar usuários reais:

- [ ] Todos os 4 segredos do `.env` foram **regenerados** (não reuse os de dev)
- [ ] `NODE_ENV=production` no backend
- [ ] `TRUST_PROXY=1` (ou conforme cadeia de proxies)
- [ ] `CORS_ORIGINS` aponta APENAS pro domínio real do frontend (sem `*`)
- [ ] `COOKIE_DOMAIN` configurado pro seu domínio (`.seudominio.com`)
- [ ] HTTPS obrigatório em ambos os domínios (cookies `Secure`)
- [ ] Migrations aplicadas (`npx prisma migrate deploy`)
- [ ] Backup automático do PostgreSQL configurado (point-in-time se possível)
- [ ] Plano de rotação de `ENCRYPTION_MASTER_KEY` (90 dias é uma referência)
- [ ] Healthcheck `/health` configurado no load balancer
- [ ] Monitoramento de erros (Sentry) e métricas (uptime monitor: Better Stack, UptimeRobot)
- [ ] Política de retenção do audit log definida
- [ ] Política de privacidade publicada em `/privacidade` (LGPD Art. 9º)
- [ ] DPO designado e contato em `/lgpd/dpo`
- [ ] Pentest profissional antes de operar com dados clínicos reais

## Custos estimados (mensal, em USD)

Configuração mínima para começar (~100-300 usuários):

| Stack                              | Mensal aprox. |
|------------------------------------|---------------|
| Railway (tudo dentro)              | $10 – $20     |
| Fly.io + Supabase (DB) + Upstash   | $5 – $15      |
| VPS Hetzner + serviços gerenciados | $8 – $20      |
| Z-API (WhatsApp)                   | R$ 89 – R$ 199|

## Scripts úteis

```bash
# Backend
npm run dev                  # tsx watch
npm run build                # compila TS pra dist/
npm run start                # roda produção a partir de dist/
npm run prisma:migrate       # migration dev (cria + aplica)
npm run prisma:migrate:prod  # apenas aplica em prod
npm run prisma:studio        # GUI do banco

# Frontend
npm run dev                  # Vite dev server (HMR)
npm run build                # build estático em dist/
npm run preview              # serve a build pra teste
```

## Suporte e contribuição

Issues e PRs bem-vindos. Para dúvidas de segurança que envolvam
divulgação responsável, envie por canal privado em vez de issue pública.

## Licença

Proprietária por padrão. Ajuste conforme seu modelo de negócio.
