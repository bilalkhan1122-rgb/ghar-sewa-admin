'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminApi, type DashboardWidgets } from '@/lib/api';
import { BellIcon, HouseIcon, SearchIcon, SignOutIcon } from '@/components/icons';

/**
 * Top-nav shell from the Figma design: a dark header panel carrying the brand,
 * the nav and each page's hero, sitting over a light body. Every colour comes
 * from a token in globals.css — nothing here hardcodes a palette shade.
 */
type NavItem = {
  href: string;
  label: string;
  /** Which queue this item owns, so the nav can flag what needs attention. */
  count?: (w: DashboardWidgets) => number;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Overview' },
  { href: '/providers', label: 'Providers' },
  { href: '/users', label: 'Customers' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/categories', label: 'Categories' },
  { href: '/verifications', label: 'Verifications', count: (w) => w.pendingVerifications },
  { href: '/disputes', label: 'Disputes', count: (w) => w.openDisputes },
  {
    href: '/wallet',
    label: 'Wallet',
    count: (w) => w.pendingTopUps + w.pendingWithdrawals,
  },
  { href: '/reports', label: 'Reports' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [widgets, setWidgets] = useState<DashboardWidgets | null>(null);

  // Auth lives in httpOnly cookies on the API's domain, so this server cannot
  // read them — the guard has to run in the browser rather than in middleware.
  useEffect(() => {
    if (status === 'guest') router.replace('/login');
  }, [status, router]);

  // Queue counts for the nav. Best-effort: a failure here must never block the
  // page, so it silently leaves the badges off.
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    adminApi.dashboard
      .widgets()
      .then((w) => !cancelled && setWidgets(w))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== 'authenticated') {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-fg-subtle">
          {status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-header">
        <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-6 py-4">
          <Link href="/" className="flex shrink-0 cursor-pointer items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-fg">
              <HouseIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[15px] font-semibold text-fg-on-dark">Ghar Sewa</span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {NAV.map((item) => {
              const active = pathname === item.href;
              const count = widgets && item.count ? item.count(widgets) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? 'bg-header-nav-active font-medium text-fg-on-dark'
                      : 'text-fg-on-dark-muted hover:text-fg-on-dark'
                  }`}>
                  {item.label}
                  {count > 0 && (
                    <span className="rounded-full bg-badge-amber px-1.5 text-[11px] font-semibold tabular-nums text-badge-amber-fg">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <SearchIcon className="h-5 w-5 text-fg-on-dark-muted" />
            <BellIcon className="h-5 w-5 text-fg-on-dark-muted" />
            <span
              title={user?.email}
              className="grid h-9 w-9 place-items-center rounded-full bg-header-card text-xs font-semibold text-fg-on-dark">
              {(user?.fullName ?? 'A').slice(0, 1).toUpperCase()}
            </span>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="cursor-pointer rounded-lg p-1.5 text-fg-on-dark-muted transition hover:bg-header-card hover:text-fg-on-dark">
              <SignOutIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
