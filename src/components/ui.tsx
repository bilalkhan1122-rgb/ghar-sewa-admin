'use client';

import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  caption,
  tone = 'default',
  href,
}: {
  label: string;
  value: string | number;
  caption?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
  href?: string;
}) {
  const toneClass = {
    default: 'text-neutral-900',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-emerald-600',
  }[tone];

  const body = (
    <>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {caption && <p className="mt-1 text-xs text-neutral-400">{caption}</p>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow">
        {body}
      </a>
    );
  }
  return <Card>{body}</Card>;
}

const BADGE_TONES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  OPEN: 'bg-amber-50 text-amber-700 ring-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 ring-blue-200',
  WAITING_FOR_RESPONSE: 'bg-blue-50 text-blue-700 ring-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  BANNED: 'bg-red-50 text-red-700 ring-red-200',
  SUSPENDED: 'bg-red-50 text-red-700 ring-red-200',
};

export function Badge({ status }: { status: string }) {
  const tone = BADGE_TONES[status] ?? 'bg-neutral-100 text-neutral-600 ring-neutral-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants = {
    primary: 'bg-orange-600 text-white hover:bg-orange-700',
    secondary: 'bg-white text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants} ${className}`}>
      {children}
    </button>
  );
}

/** Horizontally scrollable table shell — wide admin tables must never scroll the page. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <p className="px-4 py-10 text-center text-sm text-neutral-400">{message}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
      {message}
    </p>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 text-sm text-neutral-500">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

export function rupees(value: number): string {
  return `Rs ${Math.round(value).toLocaleString('en-PK')}`;
}
