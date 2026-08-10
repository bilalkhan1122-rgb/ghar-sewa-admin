/**
 * Fetch wrapper for the Ghar Sewa backend (NestJS, `api/v1`, httpOnly-cookie auth).
 *
 * The auth cookies belong to the API's own domain, so this dashboard's server
 * can never read them: every call runs in the browser with `credentials:
 * 'include'`. That also means route protection is client-side (see AuthProvider)
 * rather than Next.js middleware.
 */
const DEFAULT_BASE_URL = 'https://ghar-sewa-backaend.vercel.app/api/v1';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_BASE_URL;

/** Origin only (no `/api/v1`) — uploaded files are served from here. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/** Resolves a backend-relative file path to an absolute URL. */
export function fileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

/** Prisma `Decimal` fields serialize as numeric strings — convert at the point of use. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

/** Builds a `?a=1&b=2` query string, skipping undefined/null/empty values. */
export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Turns a caught error into UI-ready text. Validation failures carry the generic
 * "Validation failed" plus the real per-field reasons in `details`.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details) && err.details.every((d) => typeof d === 'string')) {
      return err.details.join('\n');
    }
    return err.message;
  }
  return fallback;
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message: string; code: string; details?: unknown };
};

/** Auth endpoints that must never trigger a refresh-and-replay. */
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
]);

function doFetch(path: string, init: RequestInit, isFormData: boolean): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: isFormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });
}

/**
 * The access-token cookie is short-lived. Shared across concurrent 401s so a
 * burst of requests triggers one refresh rather than one each.
 */
let refreshPromise: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doFetch('/auth/refresh', { method: 'POST' }, false)
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, isFormData = false): Promise<T> {
  let res: Response;
  try {
    res = await doFetch(path, init, isFormData);
  } catch {
    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}.`,
      0,
      'NETWORK_ERROR',
    );
  }

  // Access token expired mid-session — refresh once and replay.
  if (res.status === 401 && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, init, isFormData);
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? ((await res.json()) as ApiEnvelope<T>) : undefined;

  if (!res.ok || !body?.success) {
    throw new ApiError(
      res.status === 401
        ? 'Your session has expired. Please sign in again.'
        : body?.error?.message || res.statusText || 'Request failed',
      res.status,
      body?.error?.code || 'UNKNOWN_ERROR',
      body?.error?.details,
    );
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
