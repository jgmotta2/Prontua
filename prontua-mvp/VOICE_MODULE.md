# Módulo de Voz — Prontua

Implementação completa do pipeline **Gravação → Transcrição → Prontuário → PDF Clínico**.

---

## 1. Instalar dependências novas

```bash
# Backend
cd prontua-mvp/backend
npm install openai multer puppeteer
npm install -D @types/multer

# Frontend  
# Nenhuma dependência nova — usa MediaRecorder API nativa do browser
```

---

## 2. Variáveis de ambiente (`.env`)

Adicione ao `backend/.env` (copiar do `.env.example`):

```env
OPENAI_API_KEY="sk-sua-chave-aqui"
OPENAI_MODEL_TRANSCRIPTION="whisper-1"
OPENAI_MODEL_REPORT="gpt-4o"
RATE_LIMIT_AUDIO_PER_MIN=2
TCLE_VERSION="v1.0"
```

> ⚠️ **LGPD**: A conta OpenAI deve ter **Zero Data Retention** habilitado em
> [platform.openai.com/settings/organization/data-controls](https://platform.openai.com/settings/organization/data-controls)

---

## 3. Migração do banco

```bash
cd prontua-mvp/backend
npx prisma migrate dev --name add_voice_module
npx prisma generate
```

---

## 4. Novos arquivos criados

### Backend
| Arquivo | Descrição |
|---------|-----------|
| `prisma/schema.prisma` | + `PatientConsent`, `VoiceSessionReport`, novos `AuditAction` |
| `src/config/env.ts` | + vars OpenAI e rate limit de áudio |
| `src/config/prisma.ts` | + novos models no `TENANT_SCOPED_MODELS` |
| `src/infrastructure/ai/transcription.service.ts` | Whisper API com deleção efêmera |
| `src/infrastructure/ai/llm.service.ts` | GPT-4o estruturação clínica |
| `src/infrastructure/pdf/pdf.service.ts` | Puppeteer → PDF com timbre |
| `src/application/use-cases/consent/record-consent.use-case.ts` | Salva TCLE auditável |
| `src/application/use-cases/consent/check-consent.use-case.ts` | Verifica consentimento |
| `src/application/use-cases/voice/upload-audio.use-case.ts` | Pipeline áudio → texto |
| `src/application/use-cases/voice/get-report.use-case.ts` | Busca prontuário |
| `src/application/use-cases/voice/update-report.use-case.ts` | Edição pré-finalização |
| `src/application/use-cases/voice/finalize-report.use-case.ts` | Gera PDF e trava |
| `src/presentation/http/schemas/voice.schema.ts` | Validações Zod |
| `src/presentation/http/routes/consent.routes.ts` | `GET/POST /consent/patients/:id` |
| `src/presentation/http/routes/voice.routes.ts` | `POST /upload`, `GET/PATCH /reports`, `POST /finalize`, `GET /pdf` |

### Frontend
| Arquivo | Descrição |
|---------|-----------|
| `src/lib/api/client.ts` | + método `api.upload()` para multipart |
| `src/features/voice/hooks/useConsent.ts` | Query + mutation de TCLE |
| `src/features/voice/hooks/useVoiceRecording.ts` | MediaRecorder + Web Audio waveform |
| `src/features/voice/hooks/useVoiceReport.ts` | CRUD de relatórios + download PDF |
| `src/features/voice/components/ConsentValidator.tsx` | Modal bloqueante PILAR 1 |
| `src/features/voice/components/VoiceRecorder.tsx` | Gravação + waveform PILAR 2 |
| `src/features/voice/components/VoiceReportEditor.tsx` | Editor + PDF PILAR 3 |
| `src/features/voice/components/VoicePage.tsx` | Orquestrador dos 3 pilares |

---

## 5. Rotas da API

```
POST   /consent/patients/:patientId       # Registra TCLE (gera log auditável)
GET    /consent/patients/:patientId       # Verifica status do consentimento

POST   /voice/sessions/:sessionId/upload  # Upload áudio → transcrição → prontuário
GET    /voice/sessions/:sessionId/report  # Busca prontuário da sessão
GET    /voice/reports/:reportId           # Busca prontuário por ID
PATCH  /voice/reports/:reportId           # Edita markdown (pre-finalização)
POST   /voice/reports/:reportId/finalize  # Finaliza + gera PDF (stream de download)
GET    /voice/reports/:reportId/pdf       # Download PDF já gerado
```

---

## 6. Fluxo de usuário

1. **Agenda** → clique em 🎙️ "Prontuário" na sessão
2. **Fase 1 — Consentimento**: modal mostra TCLE; profissional confirma → salva log criptografado no banco
3. **Fase 2 — Gravação**: waveform animada + cronômetro → "Parar" → "Gerar Prontuário"
4. **Upload**: áudio vai para o backend → Whisper transcreve → áudio deletado em < 60s → GPT-4o estrutura
5. **Fase 3 — Editor**: split view (Markdown editável | preview visual) + "Finalizar e Baixar PDF"
6. **PDF**: documento com timbre, margens 20mm, rodapé LGPD, numeração de páginas → download imediato

---

## 7. Segurança implementada

| Requisito | Implementação |
|-----------|---------------|
| Áudio efêmero | `fs.unlink()` dentro do `finally` do `transcribeAudio()` |
| Zero Data Retention | Configuração na conta OpenAI (documentado no `.env.example`) |
| TCLE obrigatório | Verificação em `uploadAudioUseCase()` → 403 sem consentimento |
| Log auditável | IP hasheado + timestamp + versão do termo na tabela `patient_consents` |
| Anti Denial-of-Wallet | Rate limiter: 2 uploads/min por profissional |
| JWT HttpOnly | Cookie `sereno_at` via `authRequired()` middleware |
| Multi-tenant isolation | `forTenant()` + `TENANT_SCOPED_MODELS` cobre `PatientConsent` e `VoiceSessionReport` |
| Prontuário imutável | `isFinalized = true` → todas as operações de update bloqueadas |
| LGPD/CFP compliance | Rodapé obrigatório no PDF + campo `registry` do profissional |

---

## 8. Puppeteer em produção (Docker)

Se estiver rodando em container Alpine/Linux, o Chrome do Puppeteer precisa de libs nativas:

```dockerfile
# Adicionar ao Dockerfile do backend
RUN apt-get update && apt-get install -y \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 \
    libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 \
    libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    lsb-release wget xdg-utils --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*
```

Para serverless (Vercel/AWS Lambda), substitua `puppeteer` por `puppeteer-core` + `@sparticuz/chromium`.
