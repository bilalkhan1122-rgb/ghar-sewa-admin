'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  adminApi,
  apiErrorMessage,
  jobsApi,
  reportsApi,
  toNumber,
  type AdminJob,
  type DashboardSummary,
  type ProvidersReport,
} from '@/lib/api';
import { BriefcaseIcon, DisputeIcon, DollarIcon, StarIcon, UsersIcon } from '@/components/icons';
import {
  Badge,
  Card,
  CardHeading,
  Empty,
  ErrorNote,
  MetricCard,
  PageBody,
  PageHero,
  rupees,
} from '@/components/ui';

/** Bars for the week chart, oldest → newest, labelled by weekday. */
type DayBar = { label: string; value: number };

/**
 * `YYYY-MM-DD` in the viewer's own timezone. `toISOString()` would give the UTC
 * day, which in Pakistan (UTC+5) is still yesterday until 5am — jobs posted
 * early in the morning landed under the wrong weekday label.
 */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Buckets the fetched jobs into the last seven days. Derived client-side
 * because the API exposes job totals but no daily series — see the note in the
 * card's subtitle if this ever needs to cover more than one page of jobs.
 */
function lastSevenDays(jobs: AdminJob[]): DayBar[] {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    const key = localDayKey(new Date(job.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      value: counts.get(localDayKey(d)) ?? 0,
    });
  }
  return days;
}

export default function OverviewPage() {
  const { can } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [providers, setProviders] = useState<ProvidersReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard
      .summary()
      .then(setSummary)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the dashboard.')));

    // One page of recent jobs powers both the week chart and the table below.
    jobsApi
      .list({ page: 1, limit: 100, sortOrder: 'desc' })
      .then((res) => setJobs(res.data))
      .catch(() => {});

    reportsApi
      .providers()
      .then(setProviders)
      .catch(() => {});
  }, []);

  const week = lastSevenDays(jobs);
  const weekTotal = week.reduce((s, d) => s + d.value, 0);
  const maxDay = Math.max(1, ...week.map((d) => d.value));
  const recent = jobs.slice(0, 5);
  const totalJobs =
    (summary?.jobs.pending ?? 0) + (summary?.jobs.active ?? 0) + (summary?.jobs.completed ?? 0);

  return (
    <>
      <PageHero
        title="Dashboard Overview"
        subtitle="Real-time operations & marketplace health in Pakistan"
        metrics={
          <>
            <MetricCard
              label="Total Jobs"
              value={totalJobs}
              tone="violet"
              icon={<BriefcaseIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Active Providers"
              value={summary?.providers.approvedProviders ?? 0}
              tone="amber"
              icon={<UsersIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Commission"
              value={rupees(toNumber(summary?.finance.totalPlatformCommission))}
              tone="green"
              icon={<DollarIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Open Disputes"
              value={summary?.disputes.openDisputes ?? 0}
              tone="red"
              icon={<DisputeIcon className="h-5 w-5" />}
            />
          </>
        }
      />

      <PageBody>
        <ErrorNote message={error} />

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.9fr_1fr]">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <CardHeading
                title="Jobs This Week"
                subtitle="Daily jobs posted over the last 7 days"
              />
              <p className="text-2xl font-bold tabular-nums text-fg">{weekTotal}</p>
            </div>

            <div className="mt-6 flex h-52 items-end gap-3">
              {week.map((day) => (
                <div key={day.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div
                    title={`${day.label}: ${day.value}`}
                    className="rounded-t-lg bg-gradient-to-b from-chart-primary to-chart-primary-soft transition-opacity hover:opacity-80"
                    style={{ height: `${day.value === 0 ? 2 : (day.value / maxDay) * 100}%` }}
                  />
                  <span className="text-center text-xs text-fg-muted">{day.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeading title="Top Providers" subtitle="Highly-rated professionals" />
            {!providers || providers.topProviders.length === 0 ? (
              <Empty message="No rated providers yet." />
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {providers.topProviders.slice(0, 5).map((p) => (
                  <li key={p.providerId} className="flex items-center gap-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                      {p.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{p.fullName}</p>
                      <p className="truncate text-xs text-fg-muted">{p.email}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-fg">
                      <StarIcon className="h-4 w-4 text-badge-amber-fg" />
                      {Number(p.averageRating).toFixed(1)}
                      <span className="text-xs font-normal text-fg-subtle">({p.totalReviews})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <Card className="p-0">
          <div className="flex items-center justify-between gap-4 p-5">
            <CardHeading
              title="Recent Jobs"
              subtitle="Latest service bookings across active cities"
            />
            {can('jobs') && (
              <Link
                href="/jobs"
                className="cursor-pointer text-sm font-medium text-brand hover:underline">
                View all
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <Empty message="No jobs posted yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-y border-line text-xs font-medium uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="px-5 py-3">Job ID</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((job) => (
                    <tr key={job.id} className="transition hover:bg-surface-muted">
                      <td className="px-5 py-4 font-mono text-xs text-fg-muted">
                        #{job.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-fg">{job.title}</td>
                      <td className="px-5 py-4">
                        <Badge status={job.status} />
                      </td>
                      <td className="px-5 py-4 text-fg-muted">{job.category?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums text-fg">
                        {rupees(toNumber(job.offeredPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
