# Prontua

Sistema de gestão clínica para profissionais de saúde: pacientes, agenda, sessões, financeiro e prontuário com IA.

## Stack

- **Backend** — Node.js + Express + Prisma + SQLite (dev) / PostgreSQL (prod)
- **Frontend** — React + Vite + Tailwind CSS + TanStack Query
- **Auth** — JWT em cookies HttpOnly + Argon2id + MFA obrigatório por email OTP
- **IA** — Whisper (transcrição de áudio) + GPT-4o (estruturação de prontuário)

## Estrutura do repositório

```
sereno-mvp/
  backend/    → API REST (Express + Prisma + Clean Architecture)
  frontend/   → App React (Vite + React Router + TanStack Query)
dashboard-preview.html → protótipo estático (referência de UI)
```

## Rodando localmente

```bash
# 1. Backend
cd sereno-mvp/backend
cp .env.example .env        # preencha as variáveis (ver tabela abaixo)
npm install
npx prisma migrate dev
npm run dev                 # → http://localhost:4000

# 2. Frontend (em outro terminal)
cd sereno-mvp/frontend
npm install
npm run dev                 # → http://localhost:5173
```

## Variáveis de ambiente

Copie `sereno-mvp/backend/.env.example` e preencha:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho absoluto do SQLite ou URL do PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo do access token (`openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (diferente do access) |
| `ENCRYPTION_MASTER_KEY` | Chave AES-256 em base64 (`openssl rand -base64 32`) |
| `HASH_PEPPER` | Pepper para hashes de IP/CPF (`openssl rand -hex 16`) |
| `RESEND_API_KEY` | API key do Resend para envio de OTP por email |
| `OPENAI_API_KEY` | API key da OpenAI para transcrição e prontuário |
| `FRONTEND_URL` | URL do frontend (ex: `https://app.prontua.com.br`) |

## Features

- **Autenticação** — Cadastro, login com MFA obrigatório por email OTP, refresh automático de token, logout
- **Pacientes** — CRUD completo, CPF criptografado (AES-256-GCM), busca por nome
- **Agenda** — Visualização semanal por dia, criação/edição/cancelamento de sessões
- **Financeiro** — Listagem de pagamentos, marcação de pago com método
- **Prontuário por voz** — Gravação de áudio → transcrição Whisper → estruturação GPT-4o → PDF
- **Consentimento (TCLE)** — Registro de consentimento do paciente antes da gravação
- **Configurações** — Perfil profissional, foto de perfil (upload + compressão), troca de senha
- **Dashboard** — KPIs (receita, sessões, pacientes ativos), gráfico de receita, agenda do dia
- **Landing page** — Página pública com planos, FAQ, depoimentos, CTA
