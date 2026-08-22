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

/**
 * Endpoints where a 401 is an ordinary answer rather than a session that just
 * died: a wrong password on sign-in, and the probe the app runs on boot to see
 * whether there is a session at all. Everything else reaching a 401 means the
 * admin was signed in a moment ago and is not any more.
 */
const ENDPOINTS_WITHOUT_SESSION_EXPIRY = new Set([
  ...AUTH_ENDPOINTS_WITHOUT_REFRESH,
  '/auth/me',
]);

let sessionExpiredHandler: (() => void) | null = null;

/**
 * Registered by AuthProvider so an expired session signs the admin out.
 *
 * Without it a 401 only ever surfaced as "your session has expired" text on
 * whichever page happened to make the call, leaving a signed-out admin sitting
 * on a dashboard where every subsequent action failed the same way.
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

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

/**
 * A rejected `fetch` is deliberately opaque: being offline, a dead host, and a
 * CORS refusal all surface as the same `TypeError`. These three need very
 * different fixes, so probe once to tell them apart. Only runs on the failure
 * path, so the extra request costs nothing in the normal case.
 */
async function diagnoseFetchFailure(): Promise<{ message: string; code: string }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      message: 'You appear to be offline. Check your internet connection and try again.',
      code: 'OFFLINE',
    };
  }

  // `no-cors` skips CORS enforcement entirely. The opaque response it returns is
  // unreadable, but the fact that it resolved at all proves DNS, TCP and TLS are
  // fine — which leaves CORS as the reason the real request was blocked.
  try {
    await fetch(API_ORIGIN, { mode: 'no-cors', cache: 'no-store' });
  } catch {
    return {
      message:
        `Could not reach the server at ${API_ORIGIN}. It may be down or still ` +
        `deploying, the URL in NEXT_PUBLIC_API_URL may be wrong, or a browser ` +
        `extension may be blocking the request.`,
      code: 'NETWORK_ERROR',
    };
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'this page';
  return {
    message:
      `The server at ${API_ORIGIN} is reachable but rejected this request from ` +
      `${origin}. Its CORS allowlist (CORS_ORIGIN) most likely does not include ` +
      `${origin} — add it and redeploy the backend.`,
    code: 'CORS_ERROR',
  };
}

async function request<T>(path: string, init: RequestInit = {}, isFormData = false): Promise<T> {
  let res: Response;
  try {
    res = await doFetch(path, init, isFormData);
  } catch {
    const { message, code } = await diagnoseFetchFailure();
    throw new ApiError(message, 0, code);
  }

  // Access token expired mid-session — refresh once and replay.
  if (res.status === 401 && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, init, isFormData);
    }
  }

  // Still unauthorised after the refresh attempt: the session is gone for good.
  if (res.status === 401 && !ENDPOINTS_WITHOUT_SESSION_EXPIRY.has(path)) {
    sessionExpiredHandler?.();
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
