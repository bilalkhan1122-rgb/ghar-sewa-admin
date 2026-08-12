'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  reportsApi,
  toNumber,
  type DateRange,
  type DisputesReport,
  type FinancialReport,
  type JobsReport,
  type ProvidersReport,
  type UsersReport,
} from '@/lib/api';
import { BarList, ColumnChart, type BarDatum } from '@/components/charts';
import { Button, Card, Empty, ErrorNote, Field, FilterBar, inputClass, PageBody, PageHeader, rupees, SectionLabel, selectClass, StatCard, Table, Tabs } from '@/components/ui';

type ReportTab = 'users' | 'providers' | 'jobs' | 'financial' | 'disputes';

const TABS: { value: ReportTab; label: string }[] = [
  { value: 'users', label: 'Users' },
  { value: 'providers', label: 'Providers' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'financial', label: 'Financial' },
  { value: 'disputes', label: 'Disputes' },
];

/** Presets cover the common asks; "custom" hands control to the date inputs. */
const PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
] as const;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Status names → validated chart hues. Anything unrecognised stays primary. */
function toneFor(label: string): BarDatum['tone'] {
  const key = label.toUpperCase();
  if (/(APPROVED|RESOLVED|COMPLETED|ACTIVE)/.test(key)) return 'ok';
  if (/(PENDING|INCOMPLETE|OPEN|UNDER_REVIEW|WAITING)/.test(key)) return 'warn';
  if (/(REJECTED|BANNED|CANCELLED|EXPIRED|DISPUTED)/.test(key)) return 'bad';
  return 'info';
}

function toBars(record: Record<string, number> | undefined): BarDatum[] {
  return Object.entries(record ?? {})
    .map(([label, value]) => ({
      label: label.replace(/_/g, ' ').toLowerCase(),
      value,
      tone: toneFor(label),
    }))
    .sort((a, b) => b.value - a.value);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('users');
  const [preset, setPreset] = useState<string>('30');
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(30));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [applied, setApplied] = useState(0);

  const [data, setData] = useState<
    UsersReport | ProvidersReport | JobsReport | FinancialReport | DisputesReport | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const range: DateRange = preset === 'all' ? {} : { dateFrom, dateTo };
    const fetcher = {
      users: () => reportsApi.users(range),
      providers: () => reportsApi.providers(range),
      jobs: () => reportsApi.jobs(range),
      financial: () => reportsApi.financial(range),
      disputes: () => reportsApi.disputes(range),
    }[tab];

    fetcher()
      .then((res) => {
        setError(null);
        setData(res);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this report.')))
      .finally(() => setLoading(false));
    // Date fields are read at call time; `applied` is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, preset, applied]);

  useEffect(() => {
    load();
  }, [load]);

  /** Re-fetch triggers own the loading flag — the effect must not set state synchronously. */
  const reload = (fn: () => void) => {
    setLoading(true);
    setData(null);
    fn();
  };

  const choosePreset = (value: string) => {
    setLoading(true);
    setData(null);
    setPreset(value);
    if (value !== 'custom' && value !== 'all') {
      setDateFrom(isoDaysAgo(Number(value)));
      setDateTo(new Date().toISOString().slice(0, 10));
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Platform analytics across users, providers, jobs, money and disputes."
      />

      <PageBody>
      <Tabs tabs={TABS} value={tab} onChange={(t) => reload(() => setTab(t))} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          reload(() => setApplied((n) => n + 1));
        }}>
        <FilterBar>
          <Field label="Period">
            <select
              value={preset}
              onChange={(e) => choosePreset(e.target.value)}
              className={selectClass}>
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              type="date"
              value={dateFrom}
              disabled={preset === 'all'}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPreset('custom');
              }}
              className={`cursor-pointer disabled:opacity-50 ${inputClass}`}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={dateTo}
              disabled={preset === 'all'}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPreset('custom');
              }}
              className={`cursor-pointer disabled:opacity-50 ${inputClass}`}
            />
          </Field>
          <Button type="submit">Apply</Button>
        </FilterBar>
      </form>

      <ErrorNote message={error} />
      {loading && <p className="text-sm text-fg-subtle">Loading report…</p>}

      {!loading && data && tab === 'users' && <UsersReportView report={data as UsersReport} />}
      {!loading && data && tab === 'providers' && (
        <ProvidersReportView report={data as ProvidersReport} />
      )}
      {!loading && data && tab === 'jobs' && <JobsReportView report={data as JobsReport} />}
      {!loading && data && tab === 'financial' && (
        <FinancialReportView report={data as FinancialReport} />
      )}
      {!loading && data && tab === 'disputes' && (
        <DisputesReportView report={data as DisputesReport} />
      )}
      </PageBody>
    </>
  );
}

function UsersReportView({ report }: { report: UsersReport }) {
  const daily = Object.entries(report.dailyRegistrations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ label: day.slice(5), value: count }));

  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={report.totalUsers} />
        <StatCard label="Active" value={report.activeUsers} tone="success" />
        <StatCard label="Suspended" value={report.suspendedUsers} tone="warning" />
        <StatCard label="Deleted" value={report.deletedUsers} tone="danger" />
      </section>

      <Card>
        <SectionLabel>Registrations per day</SectionLabel>
        <ColumnChart data={daily} />
      </Card>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <SectionLabel>By role</SectionLabel>
          <BarList data={toBars(report.byRole as Record<string, number>)} />
        </Card>
        <Card>
          <SectionLabel>Registrations per month</SectionLabel>
          <BarList data={toBars(report.monthlyRegistrations)} />
        </Card>
      </section>
    </>
  );
}

function ProvidersReportView({ report }: { report: ProvidersReport }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total providers" value={report.totalProviders} />
        <StatCard label="Rated providers" value={report.ratedProviders} />
        <StatCard label="Average rating" value={Number(report.averageRating).toFixed(2)} />
        <StatCard
          label="Approved"
          value={report.verificationStatistics.APPROVED ?? 0}
          tone="success"
        />
      </section>

      <Card>
        <SectionLabel>Verification status</SectionLabel>
        <BarList data={toBars(report.verificationStatistics as Record<string, number>)} />
      </Card>

      <Card className="p-0">
        <div className="p-5 pb-0">
          <SectionLabel>Top rated providers</SectionLabel>
        </div>
        {report.topProviders.length === 0 ? (
          <Empty message="No rated providers yet." />
        ) : (
          <div className="p-3">
            <Table head={['Provider', 'Contact', 'Rating', 'Reviews']}>
              {report.topProviders.map((p) => (
                <tr key={p.providerId} className="transition hover:bg-surface-muted">
                  <td className="px-4 py-3 font-medium">{p.fullName}</td>
                  <td className="px-4 py-3 text-sm text-fg-muted">
                    {p.email}
                    <span className="block text-xs text-fg-subtle">{p.phone}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{Number(p.averageRating).toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums text-fg-muted">{p.totalReviews}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

function JobsReportView({ report }: { report: JobsReport }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total jobs" value={report.totalJobs} />
        <StatCard label="Completed" value={report.completedJobs} tone="success" />
        <StatCard label="Cancelled" value={report.cancelledJobs} tone="danger" />
        <StatCard label="Expired" value={report.expiredJobs} tone="warning" />
      </section>

      <Card>
        <SectionLabel>Jobs by status</SectionLabel>
        <BarList data={toBars(report.byStatus)} />
      </Card>

      <Card>
        <SectionLabel>Jobs by category</SectionLabel>
        <BarList
          data={report.jobsByCategory.map((c) => ({
            label: c.categoryId.slice(0, 8),
            value: c.count,
          }))}
        />
      </Card>
    </>
  );
}

function FinancialReportView({ report }: { report: FinancialReport }) {
  // Money totals are headline figures, not a distribution — stat tiles, no chart.
  const tiles: { label: string; value: string; tone?: 'success' | 'warning' | 'danger' }[] = [
    { label: 'Revenue', value: rupees(toNumber(report.revenue)), tone: 'success' },
    { label: 'Commission earned', value: rupees(toNumber(report.commissionEarned)) },
    { label: 'Top-ups approved', value: rupees(toNumber(report.topUpsApproved)) },
    { label: 'Withdrawals completed', value: rupees(toNumber(report.withdrawalsCompleted)) },
    { label: 'Wallet balances', value: rupees(toNumber(report.totalWalletBalance)) },
    { label: 'Held balance', value: rupees(toNumber(report.totalHeldBalance)) },
    {
      label: 'Pending top-ups',
      value: rupees(toNumber(report.pendingTopUps)),
      tone: 'warning',
    },
    {
      label: 'Pending withdrawals',
      value: rupees(toNumber(report.pendingWithdrawals)),
      tone: 'warning',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <StatCard key={t.label} label={t.label} value={t.value} tone={t.tone} />
      ))}
    </section>
  );
}

function DisputesReportView({ report }: { report: DisputesReport }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total disputes" value={report.totalDisputes} />
        <StatCard label="Resolved" value={report.resolved} tone="success" />
        <StatCard label="Rejected" value={report.rejected} tone="danger" />
        <StatCard label="Pending" value={report.pending} tone="warning" />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <SectionLabel>By status</SectionLabel>
          <BarList data={toBars(report.byStatus)} />
        </Card>
        <Card>
          <SectionLabel>By resolution</SectionLabel>
          <BarList data={toBars(report.byResolution)} />
        </Card>
      </section>
    </>
  );
}
