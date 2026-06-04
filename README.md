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

## Usuário demo (painel clínico)

Para popular o banco com clínica, pacientes, agenda e financeiro de exemplo:

```bash
cd prontua-mvp/backend
npm run seed:demo
```

| Campo  | Valor              |
|--------|--------------------|
| E-mail | `demo@prontua.app` |
| Senha  | `Demo1234`         |

1. Backend rodando (`npm run dev` na pasta `backend`).
2. Frontend rodando (`npm run dev` na pasta `frontend`).
3. Acesse http://localhost:5173/entrar e use as credenciais acima.
4. Você será redirecionado para `/painel` (app clínico).

> O seed recria a clínica demo (`clinica-demo`) a cada execução — não use em produção.

## Lista de espera (landing) e área admin

A landing grava e-mails em `POST /lista-espera`. A visualização fica em **`/admin/emails`**, apenas para administrador da plataforma.

### 1. Configurar admin no `.env` do backend

No arquivo `prontua-mvp/backend/.env`:

```env
EMAILS_ADMIN_PLATAFORMA=seu-email@exemplo.com
```

- Vários e-mails: separados por vírgula.
- Reinicie o backend após alterar o `.env`.

**Importante:** essa variável não cria usuário nem senha. O e-mail precisa existir na tabela `users` (cadastro em `/cadastro` ou conta do seed).

**Opção com demo:** use o mesmo e-mail do seed:

```env
EMAILS_ADMIN_PLATAFORMA=demo@prontua.app
```

Login: `demo@prontua.app` / `Demo1234` → redirecionamento para `/admin/emails`.

### 2. Validar cadastro de e-mails na landing

1. Abra http://localhost:5173/ (deslogado).
2. No formulário “Quero ser avisado”, informe um e-mail de teste e envie.
3. Deve aparecer a mensagem de sucesso na própria landing.

**Conferir no admin**

1. Entre em `/entrar` com conta admin (e-mail no `.env` ou `isAdministradorPlataforma = true` no banco).
2. Abra http://localhost:5173/admin/emails.
3. O e-mail de teste deve aparecer na tabela (data e origem `landing_cta`).

**Conferir no banco (opcional)**

```bash
cd prontua-mvp/backend
npm run prisma:studio
```

Tabela `inscricoes_lista_espera`.

### Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| Login “credenciais inválidas” com e-mail do `.env` | Conta não cadastrada — use `/cadastro` ou `npm run seed:demo` |
| Login ok, mas vai para `/painel` em vez de `/admin/emails` | E-mail do login ≠ `EMAILS_ADMIN_PLATAFORMA` |
| Lista vazia no admin | Nenhum envio na landing ou backend desatualizado |
| `403` em `/admin/emails` | Usuário logado não é admin da plataforma |

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
| `EMAILS_ADMIN_PLATAFORMA` | E-mails com acesso admin à lista de espera (separados por vírgula) |
| `RATE_LIMIT_LISTA_ESPERA_PER_HOUR` | Limite de inscrições por IP/hora na landing (padrão: 10) |

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
- **Landing page** — Página pública com planos, FAQ, depoimentos, CTA de lista de espera
- **Admin plataforma** — `/admin/emails` para visualizar inscrições da landing

## Scripts úteis

```bash
# Backend
npm run dev                  # servidor de desenvolvimento
npm run build                # compila TS para dist/
npm run prisma:migrate       # cria e aplica migration de dev
npm run prisma:studio        # GUI do banco de dados
npm run seed:demo            # dados demo (demo@prontua.app / Demo1234)

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
