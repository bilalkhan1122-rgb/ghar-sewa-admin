'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiErrorMessage, authApi } from '@/lib/api';
import { Button, ErrorNote, inputClass } from '@/components/ui';

/**
 * Where the password-reset email lands (FRONTEND_URL/reset-password?token=…).
 *
 * Public on purpose — it sits outside (dashboard), so the admin auth guard
 * never runs. Anyone with a valid one-time token can set a new password here,
 * customers and providers included; the app itself has no web presence to
 * host this.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset the password. Request a new link and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Ghar Sewa</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {done ? 'Password updated.' : 'Choose a new password for your account.'}
          </p>
        </div>

        {done ? (
          <p className="text-sm text-fg-muted">
            You can now sign in with your new password — in the Ghar Sewa app, or{' '}
            <a href="/login" className="font-medium text-fg underline">
              here
            </a>{' '}
            if this is an admin account.
          </p>
        ) : !token ? (
          <ErrorNote message="This link is missing its reset token. Open the link from your email again, or request a new one." />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <ErrorNote message={error} />

            <label className="block space-y-1">
              <span className="text-sm font-medium text-fg">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-fg">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full ${inputClass}`}
              />
            </label>

            <p className="text-xs text-fg-subtle">
              At least 8 characters, with an uppercase letter, a lowercase letter, a number and a
              special character.
            </p>

            <Button type="submit" disabled={submitting} className="w-full py-2">
              {submitting ? 'Saving…' : 'Set new password'}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
