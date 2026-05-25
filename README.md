# Prontua

Sistema de gestão clínica para profissionais de saúde — pacientes, agenda, sessões, financeiro e prontuário com IA.

## Stack

- **Backend** — Node.js + Express + Prisma + SQLite (dev) / PostgreSQL (prod)
- **Frontend** — React + Vite + Tailwind CSS
- **Auth** — JWT em cookies HttpOnly + Argon2id

## Rodando localmente

```bash
# 1. Backend
cd sereno-mvp/backend
cp .env.example .env        # preencha DATABASE_URL e os segredos
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:4000

# 2. Acesse o dashboard
# Abra http://localhost:4000 no navegador
```

## Estrutura

```
sereno-mvp/
  backend/   → API REST (Express + Prisma)
  frontend/  → App React (Vite)
dashboard-preview.html → versão standalone servida pelo backend em dev
```

## Variáveis de ambiente

Copie `sereno-mvp/backend/.env.example` e preencha:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho absoluto do SQLite ou URL do PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do access token (`openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | Segredo do refresh token |
| `ENCRYPTION_MASTER_KEY` | Chave AES-256 em base64 (`openssl rand -base64 32`) |
| `HASH_PEPPER` | Pepper para hashes de IP/CPF |

> **Nunca commite o `.env` real.** O `.gitignore` já o exclui.
