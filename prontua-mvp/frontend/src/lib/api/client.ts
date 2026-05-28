/**
 * Cliente HTTP do frontend.
 *
 * Pontos-chave de segurança:
 *  - credentials: 'include' → envia cookies HttpOnly em cross-origin.
 *  - Nunca lê/grava token em localStorage/sessionStorage (mitiga XSS).
 *  - Content-Type: application/json em mutações.
 *  - Captura erros do backend no formato { error: { code, message } }.
 *  - Auto-refresh: em 401, tenta renovar via POST /auth/refresh e reexecuta uma vez.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
  status: number;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || '/api';

class ApiClientError extends Error implements ApiError {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  requestId?: string;

  constructor(payload: Omit<ApiError, 'message'> & { message: string }) {
    super(payload.message);
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
    this.requestId = payload.requestId;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

// ── Auto-refresh de token ────────────────────────────────────────────────────
// Paths cujas respostas 401 NÃO devem disparar refresh (evita loops infinitos)
const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/mfa', '/auth/logout'];

// Rotas públicas do frontend — não redirecionar para /entrar se já estiver nelas
const PUBLIC_FRONTEND_PATHS = ['/', '/entrar', '/cadastro', '/verificar-email'];
function redirectToLogin() {
  const isPublic = PUBLIC_FRONTEND_PATHS.some((p) => window.location.pathname === p);
  if (!isPublic) window.location.href = '/entrar';
}

let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

/** Tenta renovar o access token via refresh cookie.
 *  Se já houver uma renovação em progresso, aguarda a mesma Promise. */
async function tryRefresh(): Promise<boolean> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise;
  _isRefreshing = true;
  _refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .finally(() => {
      _isRefreshing = false;
      _refreshPromise = null;
    });
  return _refreshPromise;
}

// ── Função central de requisição ─────────────────────────────────────────────

async function request<T>(path: string, opts: RequestOptions = {}, _retry = false): Promise<T> {
  const { body, query, headers, ...rest } = opts;

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const init: RequestInit = {
    ...rest,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(url, init);

  // ── Auto-refresh em 401 ────────────────────────────────────────────────────
  if (
    res.status === 401 &&
    !_retry &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p))
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, opts, true); // reexecuta uma vez com token renovado
    }
    // Refresh também falhou → sessão encerrada, redireciona para login
    redirectToLogin();
    throw new ApiClientError({
      code: 'UNAUTHENTICATED',
      message: 'Sessão expirada. Redirecionando...',
      status: 401,
    });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = (data?.error ?? {}) as Partial<ApiError>;
    throw new ApiClientError({
      code: err.code ?? 'UNKNOWN',
      message: err.message ?? `Erro ${res.status}`,
      details: err.details,
      requestId: data?.requestId,
      status: res.status,
    });
  }

  return data as T;
}

export const api = {
  get:  <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put:  <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch:<T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete:<T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),

  /**
   * Upload multipart/form-data (áudio, arquivos).
   * Não define Content-Type — o browser calcula o boundary automaticamente.
   */
  upload: async <T>(path: string, formData: FormData, _retry = false): Promise<T> => {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // NÃO definir Content-Type aqui — o browser adiciona com o boundary correto
    });

    // Auto-refresh em 401
    if (res.status === 401 && !_retry) {
      const refreshed = await tryRefresh();
      if (refreshed) return api.upload<T>(path, formData, true);
      redirectToLogin();
      throw new ApiClientError({
        code: 'UNAUTHENTICATED',
        message: 'Sessão expirada. Redirecionando...',
        status: 401,
      });
    }

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const err = (data?.error ?? {}) as Partial<ApiError>;
      throw new ApiClientError({
        code: err.code ?? 'UNKNOWN',
        message: err.message ?? `Erro ${res.status}`,
        details: err.details,
        requestId: data?.requestId,
        status: res.status,
      });
    }

    return data as T;
  },
};

export { ApiClientError };
