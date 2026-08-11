'use client';

import { useEffect, useState } from 'react';
import { adminApi, apiErrorMessage, toNumber, type DashboardSummary } from '@/lib/api';
import { Card, ErrorNote, PageHeader, SectionLabel, StatCard, rupees } from '@/components/ui';

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard
      .summary()
      .then(setSummary)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the dashboard.')));
  }, []);

  return (
    <>
      <PageHeader title="Overview" subtitle={today} />
      <ErrorNote message={error} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending verifications"
          value={summary?.providers.pendingVerifications ?? 0}
          caption="Awaiting review"
          tone="warning"
          href="/verifications"
        />
        <StatCard
          label="Open disputes"
          value={summary?.disputes.openDisputes ?? 0}
          caption="Needs resolution"
          tone="danger"
          href="/disputes"
        />
        <StatCard
          label="Pending top-ups"
          value={summary?.finance.pendingTopUps ?? 0}
          caption="Awaiting approval"
          tone="warning"
          href="/wallet"
        />
        <StatCard
          label="Pending withdrawals"
          value={summary?.finance.pendingWithdrawals ?? 0}
          caption="Awaiting payout"
          tone="warning"
          href="/wallet"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <SectionLabel>Jobs</SectionLabel>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Pending" value={summary?.jobs.pending ?? 0} />
            <Row label="Active" value={summary?.jobs.active ?? 0} />
            <Row label="Completed" value={summary?.jobs.completed ?? 0} />
            <Row label="Completed today" value={summary?.jobs.todayCompletedJobs ?? 0} />
            <Row label="Disputed" value={summary?.jobs.disputed ?? 0} />
            <Row label="Cancelled" value={summary?.jobs.cancelled ?? 0} />
          </dl>
        </Card>

        <Card>
          <SectionLabel>Users</SectionLabel>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Customers" value={summary?.users.totalCustomers ?? 0} />
            <Row label="Providers" value={summary?.users.totalProviders ?? 0} />
            <Row label="New today" value={summary?.users.newUsersToday ?? 0} />
            <Row label="Approved providers" value={summary?.providers.approvedProviders ?? 0} />
            <Row label="Rejected" value={summary?.providers.rejectedProviders ?? 0} />
            <Row label="Banned" value={summary?.providers.bannedProviders ?? 0} />
          </dl>
        </Card>

        <Card>
          <SectionLabel>Finance</SectionLabel>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label="Revenue today" value={rupees(toNumber(summary?.finance.todayRevenue))} />
            <Row
              label="Total commission"
              value={rupees(toNumber(summary?.finance.totalPlatformCommission))}
            />
            <Row
              label="Platform wallet"
              value={rupees(toNumber(summary?.finance.platformWalletBalance))}
            />
            <Row
              label="All wallets"
              value={rupees(toNumber(summary?.finance.totalWalletBalance))}
            />
            <Row label="Held" value={rupees(toNumber(summary?.finance.totalHeldBalance))} />
          </dl>
        </Card>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}
