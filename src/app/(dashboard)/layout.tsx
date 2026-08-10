'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/verifications', label: 'Verifications' },
  { href: '/disputes', label: 'Disputes' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/users', label: 'Users' },
  { href: '/providers', label: 'Providers' },
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth lives in httpOnly cookies on the API's domain, so this server cannot
  // read them — the guard has to run in the browser rather than in middleware.
  useEffect(() => {
    if (status === 'guest') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-400">
          {status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'}
        </p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-orange-600 px-2 py-1 text-sm font-bold text-white">
              GS
            </span>
            <span className="text-sm font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline">{user?.email}</span>
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6">{children}</main>
    </div>
  );
}
