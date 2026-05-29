# Prontua

Sistema de gestão clínica para profissionais de saúde: pacientes, agenda, sessões, financeiro e prontuário com IA.

## Stack

- **Backend** — Node.js + Express + Prisma + SQLite (dev) / PostgreSQL (prod)
- **Frontend** — React + Vite + Tailwind CSS + TanStack Query
- **Auth** — JWT em cookies HttpOnly + Argon2id + verificação de e-mail no cadastro
- **IA** — Whisper (transcrição de áudio) + GPT-4o (estruturação de prontuário)
- **Email** — Resend (verificação de conta e notificações)

## Estrutura do repositório

```
prontua-mvp/
  backend/    → API REST (Express + Prisma + Clean Architecture)
  frontend/   → App React (Vite + React Router + TanStack Query)
```

## Rodando localmente

```bash
# 1. Backend
cd prontua-mvp/backend
cp .env.example .env        # preencha as variáveis (ver tabela abaixo)
npm install
npx prisma migrate dev
npm run dev                 # → http://localhost:4000

# 2. Frontend (em outro terminal)
cd prontua-mvp/frontend
npm install
npm run dev                 # → http://localhost:5173
```

## Variáveis de ambiente

Copie `prontua-mvp/backend/.env.example` e preencha:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho absoluto do SQLite ou URL do PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do access token (`openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (diferente do access) |
| `ENCRYPTION_MASTER_KEY` | Chave AES-256 em base64 (`openssl rand -base64 32`) |
| `HASH_PEPPER` | Pepper para hashes de IP/CPF (`openssl rand -hex 16`) |
| `RESEND_API_KEY` | API key do Resend para envio de e-mails |
| `RESEND_FROM_EMAIL` | Endereço de envio (ex: `noreply@seudominio.com`) |
| `OPENAI_API_KEY` | API key da OpenAI para transcrição e prontuário por voz |
| `FRONTEND_URL` | URL do frontend (ex: `https://app.prontua.com.br`) |

## Features

- **Autenticação** — Cadastro com verificação de e-mail, login direto por senha, refresh automático de token, logout
- **Pacientes** — CRUD completo, CPF criptografado (AES-256-GCM), busca por nome
- **Agenda** — Visualização por dia, criação/edição/cancelamento de sessões
- **Prontuário clínico** — Evolução clínica por sessão com humor, notas e próximos passos (auto-save, criptografado)
- **Prontuário por voz** — Gravação de áudio → transcrição Whisper → estruturação GPT-4o → PDF
- **Financeiro** — Listagem de pagamentos, marcação de pago com método
- **Consentimento (TCLE)** — Registro de consentimento do paciente antes da gravação de áudio
- **Configurações** — Perfil profissional, foto de perfil, verificação de e-mail, troca de senha
- **Dashboard** — KPIs (receita, sessões, pacientes ativos), gráfico de receita, agenda do dia
- **Landing page** — Página pública com planos, FAQ, depoimentos, CTA

## Scripts úteis

```bash
# Backend
npm run dev                  # servidor de desenvolvimento
npm run build                # compila TS para dist/
npm run prisma:migrate       # cria e aplica migration de dev
npm run prisma:studio        # GUI do banco de dados

# Frontend
npm run dev                  # Vite dev server (HMR)
npm run build                # build estático em dist/
```

## Checklist pré-deploy

- [ ] Todos os segredos do `.env` foram regenerados (não reusar os de dev)
- [ ] `NODE_ENV=production`
- [ ] `TRUST_PROXY=1` (conforme cadeia de proxies)
- [ ] `CORS_ORIGINS` aponta apenas para o domínio real do frontend
- [ ] HTTPS obrigatório em ambos os domínios
- [ ] Migrations aplicadas (`npx prisma migrate deploy`)
- [ ] Backup automático do banco configurado
- [ ] Monitoramento de erros configurado (ex: Sentry)
