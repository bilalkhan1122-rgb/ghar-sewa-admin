'use client';

import type { ReactNode } from 'react';
import { StarIcon } from '@/components/icons';

/** Shared control styling — every text field and select in the app uses these. */
export const inputClass =
  'rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-brand focus:ring-1 focus:ring-brand';

export const selectClass =
  'cursor-pointer rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand focus:ring-1 focus:ring-brand';

/**
 * The dark hero band beneath the nav: page title, subtitle and (on Overview)
 * a row of metric cards. Pages render this as their first child; it bleeds to
 * full width and hands the light body back to whatever follows.
 */
export function PageHero({
  title,
  subtitle,
  metrics,
  actions,
}: {
  title: string;
  subtitle?: string;
  metrics?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-header">
      <div className="mx-auto max-w-[1400px] px-6 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-fg-on-dark">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-fg-on-dark-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        {metrics && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics}</div>
        )}
      </div>
    </div>
  );
}

/** Metric tile on the dark hero: label, big figure, and a tinted icon badge. */
export function MetricCard({
  label,
  value,
  icon,
  tone = 'violet',
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: 'violet' | 'amber' | 'green' | 'red';
}) {
  const badge = {
    violet: 'bg-badge-violet text-badge-violet-fg',
    amber: 'bg-badge-amber text-badge-amber-fg',
    green: 'bg-badge-green text-badge-green-fg',
    red: 'bg-badge-red text-badge-red-fg',
  }[tone];

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-header-line bg-header-card px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm text-fg-on-dark-muted">{label}</p>
        <p className="mt-1.5 text-[26px] font-bold leading-none tabular-nums text-fg-on-dark">
          {value}
        </p>
      </div>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${badge}`}>
        {icon}
      </span>
    </div>
  );
}

/** Card header: title plus optional sub-line, matching the Figma panels. */
export function CardHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
    </div>
  );
}

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

/**
 * Alias kept so every existing page picks up the new hero without edits —
 * `PageHeader` and `PageHero` are the same component.
 */
export const PageHeader = PageHero;

/**
 * The light content area below the hero. Owns the page gutter and max width,
 * so the hero above it can bleed to the full window edge.
 */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">{children}</div>;
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
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'dark' | 'approve';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants = {
    primary: 'bg-brand text-brand-fg hover:bg-brand-hover',
    secondary: 'bg-surface text-fg ring-1 ring-line-strong hover:bg-surface-muted',
    dark: 'bg-header text-fg-on-dark hover:bg-header-card',
    // Solid green for a page-level confirm (Approve & Activate), as distinct
    // from the quiet `success` used for repeated row actions.
    approve: 'bg-ok-solid text-white hover:bg-ok-solid-hover',
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

/* ─── Filter panel (left rail on the management screens) ─────────────────── */

export function FilterPanel({
  title = 'Filters',
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-6">
      <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </aside>
  );
}

/** A labelled group inside the filter panel, separated by a hairline. */
export function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

export function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-brand"
      />
      {label}
    </label>
  );
}

export function RadioRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 cursor-pointer accent-brand"
      />
      {label}
    </label>
  );
}

/** Pill used for the city filter — outlined blue when selected. */
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
      }`}>
      {label}
    </button>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition ${
          checked ? 'bg-brand' : 'bg-line-strong'
        }`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

/** Five stars with the numeric score beside them, as in the provider cards. */
export function StarRating({ value, reviews }: { value: number; reviews?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            className={`h-4 w-4 ${i <= Math.round(value) ? 'text-badge-amber-fg' : 'text-line-strong'}`}
          />
        ))}
      </span>
      <span className="text-sm font-semibold tabular-nums text-fg">{value.toFixed(1)}</span>
      {reviews !== undefined && (
        <span className="text-xs text-fg-subtle">({reviews})</span>
      )}
    </span>
  );
}

/** The three-up CITY / … / … stat strip inside a provider card. */
export function StatTriple({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s.label} className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
            {s.label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-fg">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
