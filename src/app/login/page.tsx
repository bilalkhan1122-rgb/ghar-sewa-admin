'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { NOT_AN_ADMIN_MESSAGE, useAuth } from '@/lib/auth';
import { Button, ErrorNote } from '@/components/ui';

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      if (err instanceof Error && err.message === NOT_AN_ADMIN_MESSAGE) {
        setError(err.message);
        return;
      }
      // Same generic message either way — never reveal which field was wrong.
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Email or password is incorrect.'
          : apiErrorMessage(err, 'Something went wrong. Try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Ghar Sewa Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to the operations dashboard.</p>
        </div>

        <ErrorNote message={error} />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700">Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </label>

        <Button type="submit" disabled={submitting} className="w-full py-2">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
