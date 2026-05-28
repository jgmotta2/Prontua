# Sereno — Arquitetura & Segurança

Documento executivo das decisões técnicas. Para setup, ver `backend/README.md`
e `frontend/README.md`.

## Stack

| Camada       | Tecnologia                                                       |
|--------------|------------------------------------------------------------------|
| Frontend     | React 18 + TypeScript + Vite + Tailwind + RHF + Zod + TanStack Query |
| Backend      | Node.js 20 + TypeScript + Express + Zod                          |
| ORM / Banco  | Prisma + PostgreSQL (PgBouncer para pool)                        |
| Cache / RL   | Redis (rate-limit + sessions futuras)                            |
| Mensageria   | Z-API (WhatsApp) — apenas administrativo                         |
| Hashing      | Argon2id (senha) + HMAC-SHA256 com pepper (lookup determinístico) |
| Cripto       | AES-256-GCM em camada de aplicação (prontuário)                  |
| Auth         | JWT HS256 em Cookie HttpOnly+Secure+SameSite=Strict              |

## Arquitetura backend (Clean Architecture simplificado)

```
backend/src/
├── config/          # bootstrap (env validado, Prisma estendido)
├── domain/          # entidades + interfaces de repositório (regra pura)
├── application/     # use cases — orquestram domínio + infra
├── infrastructure/  # implementações: Prisma, crypto, Z-API, audit
├── presentation/    # HTTP: routes, controllers, middlewares, schemas
└── shared/          # errors tipados, logger Pino, types comuns
```

**Regra:** dependências apontam para dentro. `presentation` conhece
`application`; `application` conhece `domain` e usa interfaces da `infra`;
`domain` não conhece ninguém. Isso permite trocar Express por Fastify,
Prisma por outra coisa, ou criar testes do use case sem montar HTTP.

## Multi-tenancy

**Modelo:** _Shared Database, Shared Schema_ com coluna `tenantId` em todas
as tabelas de domínio (`Patient`, `Session`, `SessionNote`, `Payment`,
`WhatsappLog`).

**Isolamento em runtime:** `forTenant(tenantId)` em `config/prisma.ts`
retorna um Prisma Client estendido que **injeta automaticamente** `tenantId`
em todo `where` (reads/updates/deletes) e em todo `data` (creates) dos
modelos marcados como tenant-scoped. Tentativa de query com `tenantId`
diferente do contexto → exceção.

**Por que isso?** Em SaaS B2B com dados clínicos, o pior cenário é um bug
em uma única rota vazar prontuário entre clínicas. Forçar o filtro na
borda do ORM remove a possibilidade arquitetural de esquecer.

**Defesa adicional recomendada em produção:** ativar Row-Level Security
nativo do PostgreSQL como segunda camada (defense in depth) — mesmo
um SQL injection que passe pelo Prisma esbarra na policy do banco.

## Criptografia em repouso (prontuário)

Modelo: `SessionNote`. Campos:
- `contentEnc` (base64 do ciphertext)
- `contentIv` (base64 do IV — 96 bits, único por operação)
- `contentTag` (base64 da auth tag GCM — 128 bits)
- `keyVersion` (suporta rotação)

**Algoritmo:** AES-256-GCM. Combina confidencialidade + autenticidade
em um passo; qualquer adulteração no ciphertext faz `decrypt()` lançar.

**Master key:** lida do env (`ENCRYPTION_MASTER_KEY`). Em produção,
proveniente de KMS (AWS KMS / GCP KMS) com envelope encryption — a
aplicação opera sobre DEKs efêmeras, nunca segura a master.

**Rotação:** versionada via `keyVersion`. Job de rotação chama
`encryptionService.rotate(payload)` em batches.

**Modelo de ameaça coberto:**
- ✅ Vazamento de dump SQL → prontuários ilegíveis
- ✅ Backup em mídia comprometida → idem
- ✅ Insider DBA sem acesso ao KMS → idem
- ❌ Comprometimento do servidor em runtime (chave em memória)
- ❌ Insider com acesso ao KMS

## Autenticação & sessão

**Tokens:**
- Access JWT (15 min) → cookie `sereno_at`, path `/`
- Refresh opaco aleatório (30 dias) → cookie `sereno_rt`, path
  restrito a `/auth/refresh`

**Cookie flags:** `HttpOnly` + `Secure` + `SameSite=Strict`.

**Por que cookie e não Authorization header?**
- `HttpOnly` impede `document.cookie` → mitiga XSS na exfiltração de token
- `SameSite=Strict` impede CSRF no fluxo principal
- `Secure` exige HTTPS (em prod)

**Refresh tokens** são armazenados apenas como **SHA-256** do raw na tabela
`refresh_tokens` — mesmo um dump não vaza tokens válidos. A cada uso, o
refresh é rotacionado; reuso de um refresh já consumido invalida toda a
**family** (detecção de roubo).

**Lockout:** após 10 falhas, conta bloqueia por 15 min. Tempo de resposta
do login é equalizado (hash dummy quando o usuário não existe) para
mitigar user enumeration por timing.

## Defesas OWASP Top 10

| OWASP                              | Controle                                                                 |
|------------------------------------|--------------------------------------------------------------------------|
| A01 Broken Access Control          | RBAC hierárquico + multi-tenant via Prisma estendido + auditoria de RBAC_DENIED |
| A02 Cryptographic Failures         | AES-256-GCM (prontuário); Argon2id (senha, custo configurável); HSTS; TLS 1.3 |
| A03 Injection                      | Prisma parametrizado; Zod com `.strict()` (anti mass assignment); CSP estrita |
| A04 Insecure Design                | Use cases isolam regra de negócio; refresh token com rotation family    |
| A05 Security Misconfiguration      | Helmet completo; env validado via Zod com fail-fast; cookies `Secure` em prod |
| A06 Vulnerable Components          | `npm audit` em CI; lockfile commitado; renovação periódica                 |
| A07 Identification & Auth Failures | Argon2id; rate-limit no login (5/15min); lockout; timing-equalization      |
| A08 Software & Data Integrity      | Lockfile; auth tag GCM garante integridade do ciphertext                  |
| A09 Logging & Monitoring Failures  | Audit log append-only; redact list no Pino; IP hasheado (HMAC + pepper)   |
| A10 SSRF                           | Sem fetch dinâmico; Z-API com URL fixa; allowlist de CORS                 |

## Pipeline de middlewares (ordem crítica)

```
1. trust proxy        # respeita X-Forwarded-For (req.ip correto)
2. requestId          # correlação de logs
3. helmet             # headers de segurança em TODA resposta
4. CORS               # allowlist estrita, credentials:true
5. cookieParser       # antes do auth middleware ler o cookie
6. body parsers       # limite 100kb (anti-DoS)
7. ipHash             # popula req.ipHash (HMAC com pepper)
8. pino-http          # log estruturado com requestId
9. csrfDefense        # checa Origin/Referer em mutações
10. apiRateLimiter    # 60 req/min global por IP
11. ROUTES            # auth + tenant + RBAC + validate + audit por rota
12. errorHandler      # captura tudo, sanitiza resposta
```

Ordem é a coisa mais sutil — colocar Helmet antes de CORS, ou body parser
antes de cookieParser, causa bugs sutis em segurança e em depuração.

## Conformidade LGPD

- **Base legal:** consentimento + execução de contrato (Art. 7º, V e I).
- **Direitos do titular (Art. 18):** rota `EXPORT_REQUEST` audita pedido;
  job dedicado faz hard delete sob solicitação (não basta soft delete).
- **Encarregado (DPO):** contato exposto em rota pública `/lgpd/dpo` (a criar).
- **Incidentes:** audit log permite reconstruir acesso a prontuário.
- **Minimização:** audit metadata rejeita chaves óbvias de PII/PHI.
- **Anonimização:** IPs são hasheados com pepper antes de persistir.

## Conformidade CFP (Código de Ética)

- **Sigilo profissional (Art. 9º):** prontuário criptografado em
  repouso; acesso registrado em audit log.
- **Registro documental (Resolução CFP 001/2009):** SessionNote retém
  histórico (não há update destrutivo — versionamento futuro recomendado).
- **WhatsApp:** apenas mensagens administrativas; templates fixos com
  filtro regex anti-PHI antes do envio.

## O que falta para produção

- [ ] Migrations Prisma (`npm run prisma:migrate` para gerar a primeira)
- [ ] Use cases de `sessions`, `notes` (com EncryptionService no upsert), `dashboard`, `finance`
- [ ] Endpoint LGPD: `/lgpd/export` e `/lgpd/delete`
- [ ] MFA TOTP (campos já no schema)
- [ ] Refresh token rotation endpoint
- [ ] Migrar componentes do `sereno-app.jsx` para `frontend/src/features/`
- [ ] CI: `npm audit`, ESLint, testes, build
- [ ] Observabilidade: APM (Sentry/Datadog), métricas de auth/rate-limit
- [ ] DR: backup automático com criptografia, plano de restore testado
- [ ] Pentest profissional antes do go-live com dados reais
