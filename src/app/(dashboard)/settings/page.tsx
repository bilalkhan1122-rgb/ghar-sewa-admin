'use client';

import { useAuth } from '@/lib/auth';
import { CardHeading, PageBody, PageHeader } from '@/components/ui';

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
        <p className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn-fg">
          These platform rules are enforced by the backend and have no settings endpoint yet, so
          they are read-only here. Adding <code>GET/PATCH /admin/settings</code> would make this
          screen editable.
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
