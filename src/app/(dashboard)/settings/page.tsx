'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiErrorMessage, settingsApi, type PaymentMode } from '@/lib/api';
import { useToast } from '@/components/toast';
import { Button, CardHeading, PageBody, PageHeader } from '@/components/ui';

/**
 * Platform settings, per the Figma "platform-settings" frame.
 *
 * Only the admin account card is live — it reads the signed-in user. The rules,
 * penalties and badge thresholds are platform constants enforced server-side
 * with no read or write endpoint exposed, so they are shown read-only rather
 * than as inputs that would silently discard whatever you typed.
 */
const RULES: { label: string; value: string; tone?: 'brand' }[] = [
  { label: 'System commission rate', value: '7.5%', tone: 'brand' },
  { label: 'Job acceptance expiry', value: '24 hours' },
  { label: 'Customer dispute window', value: '48 hours' },
];

const PENALTIES: { label: string; value: string; tone: 'warn' | 'bad' | 'fg' }[] = [
  { label: 'First violation', value: '1st warning note', tone: 'warn' },
  { label: 'Second violation', value: '7-day platform ban', tone: 'bad' },
  { label: 'Third violation', value: 'Permanent ban', tone: 'fg' },
];

const BADGES: { label: string; range: string; dot: string }[] = [
  { label: 'Bronze', range: '0 – 10 completed jobs', dot: 'bg-badge-amber-fg' },
  { label: 'Silver', range: '11 – 50 completed jobs', dot: 'bg-fg-subtle' },
  { label: 'Gold', range: '51 – 200 completed jobs', dot: 'bg-badge-amber-fg' },
  { label: 'Platinum', range: '201+ completed jobs', dot: 'bg-brand' },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Platform Settings"
        subtitle="Manage commission schedules, service expiry timeouts, penalty limits, and administrator roles"
      />

      <PageBody>
        <Link
          href="/settings/admins"
          className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition hover:bg-surface-muted">
          <span>
            <span className="block text-sm font-medium">Admin accounts</span>
            <span className="block text-xs text-fg-subtle">
              Create dashboard users and choose which modules each one can reach
            </span>
          </span>
          <span aria-hidden="true" className="text-fg-subtle">
            &rarr;
          </span>
        </Link>

        <PaymentModeCard />

        <p className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-fg">
          The rules below are enforced by the backend as constants with no settings endpoint, so
          they stay read-only here. Payment mode is the exception — it is stored and editable.
        </p>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SettingsCard title="Platform Rules &amp; Commission">
            {RULES.map((r) => (
              <Row
                key={r.label}
                label={r.label}
                value={
                  <span className={r.tone === 'brand' ? 'text-brand' : 'text-fg'}>{r.value}</span>
                }
              />
            ))}
          </SettingsCard>

          <SettingsCard title="Penalty Structure">
            {PENALTIES.map((p) => (
              <Row
                key={p.label}
                label={p.label}
                value={
                  <span
                    className={
                      p.tone === 'warn'
                        ? 'text-warn-fg'
                        : p.tone === 'bad'
                          ? 'text-bad-fg'
                          : 'text-fg'
                    }>
                    {p.value}
                  </span>
                }
              />
            ))}
          </SettingsCard>

          <SettingsCard title="Provider Badges &amp; Rank Thresholds">
            {BADGES.map((b) => (
              <Row
                key={b.label}
                label={
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${b.dot}`} />
                    {b.label}
                  </span>
                }
                value={<span className="font-normal text-fg-muted">{b.range}</span>}
              />
            ))}
          </SettingsCard>

          <SettingsCard title="Admin Account Settings">
            <Row label="Admin name" value={user?.fullName ?? '—'} />
            <Row label="Secure email" value={user?.email ?? '—'} />
            <Row label="Role" value={(user?.role ?? '').toLowerCase() || '—'} />
            <Row
              label="Account created"
              value={
                user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
          </SettingsCard>
        </div>
      </PageBody>
    </>
  );
}

/**
 * The one platform rule that is genuinely stored and editable.
 *
 * Deliberately a two-option choice with the consequences spelled out rather
 * than a bare toggle: switching to post-paid means providers can finish work
 * before the customer has any money in their wallet, and that is not something
 * to flip by accident.
 */
function PaymentModeCard() {
  const toast = useToast();
  const [mode, setMode] = useState<PaymentMode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .get()
      .then((settings) => {
        if (!cancelled) setMode(settings.paymentMode);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Could not load platform settings.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = useCallback(
    async (next: PaymentMode) => {
      if (saving || next === mode) return;
      setSaving(true);
      setError(null);
      try {
        const updated = await settingsApi.setPaymentMode(next);
        setMode(updated.paymentMode);
        toast.success(
          next === 'PREPAID'
            ? 'Customers must now fund their wallet before posting.'
            : 'Customers can now post first and pay once the job is confirmed.',
        );
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not change the payment mode.');
        setError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [mode, saving, toast],
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <CardHeading
        title="Customer Payment Mode"
        subtitle="When customers have to have money in their wallet"
      />

      {error && (
        <p className="mt-3 rounded-lg border border-bad-line bg-bad-soft px-3 py-2 text-sm text-bad-fg">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ModeOption
          active={mode === 'PREPAID'}
          disabled={saving || mode === null}
          title="Prepaid"
          description="The wallet must cover the job before it can be posted or a provider booked. Nobody works unpaid."
          onSelect={() => void choose('PREPAID')}
        />
        <ModeOption
          active={mode === 'POSTPAID'}
          disabled={saving || mode === null}
          title="Post-paid"
          description="Customers post freely. The bill falls due when they confirm the job is done, the provider is paid once they top up, and they cannot post again while it is unpaid."
          onSelect={() => void choose('POSTPAID')}
        />
      </div>

      {mode === null && !error && (
        <p className="mt-3 text-sm text-fg-subtle">Loading current mode…</p>
      )}
    </section>
  );
}

function ModeOption({
  active,
  disabled,
  title,
  description,
  onSelect,
}: {
  active: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 transition ${
        active ? 'border-brand bg-brand-soft' : 'border-line bg-surface-muted'
      }`}>
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-xs text-fg-subtle">{description}</p>
      </div>
      <Button
        variant={active ? 'primary' : 'secondary'}
        disabled={disabled || active}
        onClick={onSelect}
        className="self-start">
        {active ? 'Active' : `Switch to ${title.toLowerCase()}`}
      </Button>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <CardHeading title={title} />
      <dl className="mt-3 divide-y divide-line">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-fg">{value}</dd>
    </div>
  );
}
