# Sereno — Frontend

React 18 + TypeScript + Vite + Tailwind + React Hook Form + Zod + TanStack Query.

## Setup

```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
```

O backend deve estar rodando em `http://localhost:4000`. O Vite faz proxy
de `/api → http://localhost:4000`, então o cookie HttpOnly trafega como
mesma origem em dev (sem dor de SameSite=Strict cross-site).

## Estrutura

```
src/
├── app/
│   ├── providers/      # QueryProvider, ThemeProvider, etc
│   └── routes/         # Roteamento principal + guards
├── features/           # Pastas por feature, isoladas
│   ├── auth/
│   │   ├── components/   # RegisterForm, LoginForm
│   │   ├── hooks/        # useRegister, useLogin, useSession
│   │   └── api/          # (chamadas específicas, se complexas)
│   ├── dashboard/
│   ├── patients/
│   ├── schedule/
│   ├── finance/
│   └── settings/
├── components/         # UI compartilhada (Button, Modal, Skeleton...)
│   ├── ui/
│   └── layout/         # Sidebar, TopBar, AppShell
├── hooks/              # hooks genéricos cross-feature
├── lib/
│   ├── api/            # client.ts — fetch com credentials:'include'
│   ├── validation/     # schemas Zod compartilhados
│   └── utils/          # máscaras, formatadores, helpers
├── styles/             # CSS base + tokens
└── types/              # tipos compartilhados
```

## Migração do protótipo

O protótipo `sereno-app.jsx` (já entregue) é JSX puro com tudo num arquivo só.
A estrutura TS recebe esse código quebrado por feature. Mapeamento:

| Trecho do `sereno-app.jsx`           | Destino na estrutura TS                                                    |
|--------------------------------------|----------------------------------------------------------------------------|
| `LoginScreen`, `RegisterScreen`      | `src/features/auth/components/{LoginForm,RegisterForm}.tsx`                |
| `Sidebar`                            | `src/components/layout/Sidebar.tsx`                                        |
| `BottomNav`, `FAB`                   | `src/components/layout/MobileNav.tsx`                                      |
| `Dashboard`                          | `src/features/dashboard/components/Dashboard.tsx`                          |
| `PatientList`                        | `src/features/patients/components/PatientList.tsx`                         |
| `PatientDetail`                      | `src/features/patients/components/PatientDetail.tsx`                       |
| `Schedule`                           | `src/features/schedule/components/WeekGrid.tsx`                            |
| `Finance` (KPIs + chart)             | `src/features/finance/components/{KpiRow,RevenueChart,PendingList}.tsx`   |
| `Settings`                           | `src/features/settings/components/SettingsPage.tsx`                        |
| `NewSessionModal`                    | `src/features/schedule/components/NewSessionModal.tsx`                     |
| `mockPatients`, `mockSessions`, etc. | Substituir por chamadas TanStack Query em `src/features/<f>/hooks/*`       |
| CSS vars (`--cream`, `--sage`, ...)  | Tokens em `tailwind.config.ts` + `src/styles/index.css`                    |
| Fontes Google injetadas via JS       | `<link>` em `index.html`                                                   |

## Padrões adotados

### Validação client-side
Todo formulário usa `react-hook-form` com `zodResolver`. Schema vive em
`src/lib/validation/`. O backend revalida com Zod equivalente — não confie
exclusivamente em validação client-side.

### Autenticação
**Nunca** lemos/gravamos token em `localStorage`/`sessionStorage` (mitigação XSS).
Tudo via cookie HttpOnly+Secure+SameSite=Strict do backend. O cliente apenas:
- chama `/auth/me` para descobrir quem está logado;
- envia `credentials: 'include'` em toda chamada (já é default do `api`).

### Estados de carregamento
Usar `TanStack Query`:
- `isPending` → skeleton/spinner
- `isError` → mensagem de erro (com `error.code` mapeado para mensagem amigável)
- `data` → render

### Erros do backend
O backend retorna `{ error: { code, message, details } }`. O `ApiClientError`
expõe esses campos. Para erros de validação por campo, use
`form.setError(campo, { message })` como mostrado em `RegisterForm.tsx`.

### Acessibilidade
- `label` associado a `id` em todos os inputs
- `aria-invalid` quando há erro (TODO: adicionar nos forms)
- Foco visível mantido pelo Tailwind `focus:ring-*`
- `autoComplete` correto em campos sensíveis (`new-password`, `email`, etc.)

## Scripts

| Comando            | Ação                              |
|--------------------|-----------------------------------|
| `npm run dev`      | Vite dev server                   |
| `npm run build`    | tsc + vite build                  |
| `npm run preview`  | Preview da build                  |
| `npm run lint`     | ESLint                            |
| `npm run test`     | Vitest                            |
