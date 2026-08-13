'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiErrorMessage, authApi } from '@/lib/api';
import { ErrorNote } from '@/components/ui';

/**
 * Where the email-verification mail lands (FRONTEND_URL/verify-email?token=…).
 *
 * Public on purpose — it sits outside (dashboard), so the admin auth guard never
 * runs. Google sign-ups are the main source of these mails; like /reset-password
 * this page exists because the mobile app has no web presence to host the flow.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

type State = 'verifying' | 'done' | 'failed';

function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<State>('verifying');
  const [error, setError] = useState<string | null>(null);
  // React 18 mounts effects twice in dev; the token is one-time, so a second
  // call would consume nothing and report a bogus failure.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    authApi
      .verifyEmail({ token })
      .then(() => setState('done'))
      .catch((err) => {
        setError(
          apiErrorMessage(err, 'This link is no longer valid. Request a new verification email.'),
        );
        setState('failed');
      });
  }, [token]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Ghar Sewa</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {state === 'done' ? 'Email verified.' : 'Confirming your email address.'}
          </p>
        </div>

        {!token ? (
          <ErrorNote message="This link is missing its verification token. Open the link from your email again." />
        ) : state === 'verifying' ? (
          <p className="text-sm text-fg-muted">Checking your link…</p>
        ) : state === 'done' ? (
          <p className="text-sm text-fg-muted">
            Your email address is confirmed. You can carry on in the Ghar Sewa app — nothing else is
            needed here, or sign in{' '}
            <a href="/login" className="font-medium text-fg underline">
              here
            </a>{' '}
            if this is an admin account.
          </p>
        ) : (
          <div className="space-y-4">
            <ErrorNote message={error} />
            <p className="text-sm text-fg-muted">
              Verification links expire after 24 hours. Sign in to the app and request a new one.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
