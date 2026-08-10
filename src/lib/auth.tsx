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
import { authApi, type LoginPayload, type User } from '@/lib/api';

type AuthState = {
  status: 'loading' | 'authenticated' | 'guest';
  user: User | null;
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
      setStatus('guest');
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
