'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { adminApi, type DashboardWidgets } from '@/lib/api';
import {
  CategoriesIcon,
  DisputeIcon,
  OverviewIcon,
  ProvidersIcon,
  ReportsIcon,
  SignOutIcon,
  UsersIcon,
  VerificationIcon,
  WalletIcon,
} from '@/components/icons';

type NavItem = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  /** Which queue this item owns, so the sidebar can show what needs attention. */
  count?: (w: DashboardWidgets) => number;
};

const NAV: NavItem[] = [
  { href: '/', label: 'Overview', Icon: OverviewIcon },
  {
    href: '/verifications',
    label: 'Verifications',
    Icon: VerificationIcon,
    count: (w) => w.pendingVerifications,
  },
  { href: '/disputes', label: 'Disputes', Icon: DisputeIcon, count: (w) => w.openDisputes },
  {
    href: '/wallet',
    label: 'Wallet',
    Icon: WalletIcon,
    count: (w) => w.pendingTopUps + w.pendingWithdrawals,
  },
  { href: '/users', label: 'Users', Icon: UsersIcon },
  { href: '/categories', label: 'Categories', Icon: CategoriesIcon },
  { href: '/providers', label: 'Providers', Icon: ProvidersIcon },
  { href: '/reports', label: 'Reports', Icon: ReportsIcon },
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

  const links = NAV.map((item) => {
    const active = pathname === item.href;
    const count = widgets && item.count ? item.count(widgets) : 0;
    return { ...item, active, count };
  });

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-line bg-sidebar lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-xs font-bold text-brand-fg">
            GS
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Ghar Sewa</span>
            <span className="block text-xs text-fg-subtle">Admin</span>
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {links.map(({ href, label, Icon, active, count }) => (
            <Link key={href} href={href} className={navClass(active)}>
              <span
                aria-hidden
                className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand transition-opacity ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand' : ''}`} />
              <span className="flex-1">{label}</span>
              {count > 0 && <CountBadge value={count} />}
            </Link>
          ))}
        </nav>

        <div className="border-t border-sidebar-line p-3">
          <p className="truncate px-2 pb-2 text-xs text-fg-subtle" title={user?.email}>
            {user?.email}
          </p>
          <button
            onClick={logout}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-fg-muted transition hover:bg-surface-muted hover:text-fg">
            <SignOutIcon className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar — same links, horizontal */}
        <header className="border-b border-line bg-sidebar lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-bold text-brand-fg">
                GS
              </span>
              <span className="text-sm font-semibold">Ghar Sewa Admin</span>
            </div>
            <button
              onClick={logout}
              className="cursor-pointer rounded-lg p-1.5 text-fg-muted transition hover:bg-surface-muted hover:text-fg"
              aria-label="Sign out">
              <SignOutIcon />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {links.map(({ href, label, active, count }) => (
              <Link
                key={href}
                href={href}
                className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-brand text-brand-fg' : 'text-fg-muted hover:bg-surface-muted'
                }`}>
                {label}
                {count > 0 && <CountBadge value={count} muted={active} />}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function navClass(active: boolean): string {
  return `relative flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
    active ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
  }`;
}

function CountBadge({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        muted ? 'bg-black/15 text-current' : 'bg-warn-soft text-warn-fg'
      }`}>
      {value}
    </span>
  );
}
