'use client';

import type { ReactNode } from 'react';

/** Shared control styling — every text field and select in the app uses these. */
export const inputClass =
  'rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-1 focus:ring-brand';

export const selectClass =
  'cursor-pointer rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand focus:ring-1 focus:ring-brand';

/** Underlined tab strip. `value`/`onChange` keep the active tab in the caller. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mb-px flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'border-brand text-fg'
                : 'border-transparent text-fg-muted hover:border-line-strong hover:text-fg'
            }`}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  active ? 'bg-warn-soft text-warn-fg' : 'bg-surface-muted text-fg-muted'
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Labelled control for filter bars — keeps label/field spacing consistent. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</span>
      {children}
    </label>
  );
}

/** Filter bar shell: wraps controls in a card that sits above a table. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      {children}
    </div>
  );
}

/** Key/value line used inside detail cards. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-fg">{value ?? '—'}</dd>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small uppercase label that opens a group of rows inside a Card. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{children}</h2>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}>
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
  const dot = {
    default: 'bg-fg-subtle',
    warning: 'bg-warn-fg',
    danger: 'bg-bad-fg',
    success: 'bg-ok-fg',
  }[tone];

  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
      </div>
      <p className="mt-2.5 text-[28px] font-semibold leading-none tabular-nums">{value}</p>
      {caption && <p className="mt-2 text-xs text-fg-subtle">{caption}</p>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group cursor-pointer rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-line-strong hover:shadow-md">
        {body}
      </a>
    );
  }
  return <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">{body}</div>;
}

const BADGE_TONES: Record<string, string> = {
  PENDING: 'bg-warn-soft text-warn-fg ring-warn-line',
  OPEN: 'bg-warn-soft text-warn-fg ring-warn-line',
  UNDER_REVIEW: 'bg-info-soft text-info-fg ring-info-line',
  WAITING_FOR_RESPONSE: 'bg-info-soft text-info-fg ring-info-line',
  APPROVED: 'bg-ok-soft text-ok-fg ring-ok-line',
  RESOLVED: 'bg-ok-soft text-ok-fg ring-ok-line',
  COMPLETED: 'bg-ok-soft text-ok-fg ring-ok-line',
  ACTIVE: 'bg-ok-soft text-ok-fg ring-ok-line',
  REJECTED: 'bg-bad-soft text-bad-fg ring-bad-line',
  BANNED: 'bg-bad-soft text-bad-fg ring-bad-line',
  SUSPENDED: 'bg-bad-soft text-bad-fg ring-bad-line',
};

export function Badge({ status }: { status: string }) {
  const tone = BADGE_TONES[status] ?? 'bg-surface-muted text-fg-muted ring-line';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}>
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
    primary: 'bg-brand text-brand-fg hover:bg-brand-hover',
    secondary: 'bg-surface text-fg ring-1 ring-line-strong hover:bg-surface-muted',
    // Row actions repeat once per record, so these stay quiet until hovered —
    // a table of solid red buttons reads as an alarm, not a list.
    danger: 'bg-bad-soft text-bad-fg ring-1 ring-bad-line hover:bg-bad-solid hover:text-white',
    success: 'bg-ok-soft text-ok-fg ring-1 ring-ok-line hover:bg-ok-solid hover:text-white',
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants} ${className}`}>
      {children}
    </button>
  );
}

/** Horizontally scrollable table shell — wide admin tables must never scroll the page. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-surface-muted text-xs font-medium uppercase tracking-wide text-fg-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return <p className="px-4 py-10 text-center text-sm text-fg-subtle">{message}</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-fg ring-1 ring-bad-line">
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
    <div className="flex items-center justify-between px-1 text-sm text-fg-muted">
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
