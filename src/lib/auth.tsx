'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  adminAccountsApi,
  type AccessMap,
  type AdminModuleKey,
  type LoginPayload,
  type User,
  authApi,
  setSessionExpiredHandler,
} from '@/lib/api';
import { useToast } from '@/components/toast';

type AuthState = {
  status: 'loading' | 'authenticated' | 'guest';
  user: User | null;
  /** Null until the access call resolves, and for a signed-out visitor. */
  access: AccessMap | null;
  /** False until the access call settles, so pages can wait instead of flashing. */
  accessLoaded: boolean;
  isSuperAdmin: boolean;
  /** True while access is still loading, so the nav does not flash empty. */
  can: (module: AdminModuleKey, level?: 'view' | 'full') => boolean;
  refreshAccess: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Only admins belong in this dashboard. */
export const NOT_AN_ADMIN_MESSAGE = 'This account does not have admin access.';

/**
 * Restore a session from the httpOnly cookies the API set, if still valid.
 * A 401 here is already refreshed-and-replayed inside the API client, so
 * reaching the catch means there is genuinely no session to restore.
 */
async function restore(): Promise<User | null> {
  try {
    return await authApi.me();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessMap | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const router = useRouter();
  const toast = useToast();
  // A dead session usually produces a burst of 401s — one per in-flight
  // request. Only the first should sign anyone out.
  const expiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    restore().then((restored) => {
      if (cancelled) return;
      if (restored && restored.role === 'ADMIN') {
        setUser(restored);
        setStatus('authenticated');
      } else {
        setStatus('guest');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Drops every trace of the signed-in admin and sends them to sign in again. */
  const endSession = useCallback(() => {
    setUser(null);
    setAccess(null);
    setIsSuperAdmin(false);
    setAccessLoaded(false);
    setStatus('guest');
    router.replace('/login');
  }, [router]);

  // The API client cannot navigate or clear React state, so it hands an
  // unrecoverable 401 back here. Without this an expired session left the
  // dashboard on screen with every request failing "unauthorised".
  //
  // Re-registered whenever `status` changes so the handler always sees the
  // current one: a 401 before sign-in is just a signed-out visitor, not a
  // session that died, and must not toast at them on the login screen.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (expiredRef.current || status !== 'authenticated') return;
      expiredRef.current = true;
      endSession();
      toast.error('Your session has expired. Please sign in again.');
    });
    return () => setSessionExpiredHandler(null);
  }, [status, endSession, toast]);

  const refreshAccess = useCallback(async () => {
    try {
      // The header renders the name and initial, so the account itself is
      // re-read too — a profile edit has to show up there without a reload.
      const [me, account] = await Promise.all([authApi.me(), adminAccountsApi.me()]);
      setUser(me);
      setAccess(account.access);
      setIsSuperAdmin(account.isSuperAdmin);
    } catch {
      // A failure here must not sign anyone out. Leaving access null keeps the
      // nav in its loading shape rather than falsely showing zero modules.
      setAccess(null);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    adminAccountsApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setAccess(me.access);
        setIsSuperAdmin(me.isSuperAdmin);
      })
      .catch(() => {
        // Deliberately fails open: if this one endpoint is down, an admin keeps
        // the full nav rather than being locked out of the whole dashboard. The
        // server still enforces every permission, so nothing is actually
        // reachable that should not be.
        if (!cancelled) setAccess(null);
      })
      .finally(() => {
        if (!cancelled) setAccessLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      if (result.user.role !== 'ADMIN') {
        // Valid credentials, wrong audience — drop the session we just created.
        await authApi.logout().catch(() => undefined);
        throw new Error(NOT_AN_ADMIN_MESSAGE);
      }
      expiredRef.current = false;
      setUser(result.user);
      setStatus('authenticated');
      router.replace('/');
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      expiredRef.current = false;
      endSession();
    }
  }, [endSession]);

  /**
   * Permission check for the UI. Returns true while access is still loading so
   * the nav renders its full shape and then narrows, rather than appearing
   * empty for a beat on every page load.
   */
  const can = useCallback(
    (module: AdminModuleKey, level: 'view' | 'full' = 'view') => {
      if (isSuperAdmin || access === null) return true;
      const granted = access[module];
      if (granted === 'full') return true;
      return level === 'view' && granted === 'view';
    },
    [access, isSuperAdmin],
  );

  const value = useMemo(
    () => ({ status, user, access, accessLoaded, isSuperAdmin, can, refreshAccess, login, logout }),
    [status, user, access, accessLoaded, isSuperAdmin, can, refreshAccess, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
