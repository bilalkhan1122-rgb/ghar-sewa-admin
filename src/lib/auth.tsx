'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
} from '@/lib/api';

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

/** Restore a session from the httpOnly cookies the API set, if still valid. */
async function restore(): Promise<User | null> {
  try {
    return await authApi.me();
  } catch {
    try {
      await authApi.refresh();
      return await authApi.me();
    } catch {
      return null;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<AccessMap | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);
  const router = useRouter();

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

  const refreshAccess = useCallback(async () => {
    try {
      const me = await adminAccountsApi.me();
      setAccess(me.access);
      setIsSuperAdmin(me.isSuperAdmin);
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
      setUser(null);
      setAccess(null);
      setIsSuperAdmin(false);
      setAccessLoaded(false);
      setStatus('guest');
      router.replace('/login');
    }
  }, [router]);

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
