'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  analyticsApi,
  apiErrorMessage,
  toNumber,
  type AnalyticsOverview,
  type AnalyticsQuery,
  type AnalyticsRange,
  type BookingAnalytics,
  type CategoryAnalytics,
  type CustomerAnalytics,
  type JobsAnalytics,
  type RevenueAnalytics,
} from '@/lib/api';
import { BarList, ColumnChart } from '@/components/charts';
import {
  Button,
  Card,
  CardHeading,
  Empty,
  ErrorNote,
  Field,
  FilterBar,
  PageBody,
  PageHeader,
  rupees,
  SectionLabel,
  selectClass,
  StatCard,
  Table,
} from '@/components/ui';
import { useToast } from '@/components/toast';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_90_DAYS', label: 'Last 90 days' },
  { value: 'LAST_12_MONTHS', label: 'Last 12 months' },
  { value: 'ALL_TIME', label: 'All time' },
];

/** `{ '2026-08-12': 5 }` → chart rows, oldest first. */
function series(map: Record<string, number> | undefined) {
  return Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

function hours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value < 1 ? `${Math.round(value * 60)} min` : `${value.toFixed(1)} h`;
}

/**
 * Module 21 analytics. Deliberately does not repeat the Reports page — this
 * covers what reports cannot answer: how long the booking lifecycle takes,
 * which categories actually convert, and how many customers come back.
 */
export default function AnalyticsPage() {
  const toast = useToast();
  const [range, setRange] = useState<AnalyticsRange>('LAST_30_DAYS');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [jobs, setJobs] = useState<JobsAnalytics | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [customers, setCustomers] = useState<CustomerAnalytics | null>(null);
  const [categories, setCategories] = useState<CategoryAnalytics | null>(null);
  const [bookings, setBookings] = useState<BookingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const query: AnalyticsQuery = { range };
    Promise.all([
      analyticsApi.overview(query).then(setOverview),
      analyticsApi.jobs(query).then(setJobs),
      analyticsApi.revenue(query).then(setRevenue),
      analyticsApi.customers(query).then(setCustomers),
      analyticsApi.categories(query).then(setCategories),
      analyticsApi.bookings(query).then(setBookings),
    ])
      // Cleared on success rather than before the request, so nothing in this
      // path sets state synchronously inside the effect.
      .then(() => setError(null))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load analytics.')))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  /** The API returns the CSV body inline; the browser turns it into a file. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const file = await analyticsApi.exportCsv({ range });
      const url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      // Firefox ignores a click on a detached anchor, and revoking the object
      // URL in the same tick cancels the download Safari has only just started.
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(`Exported ${file.filename}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export the CSV.'));
    } finally {
      setExporting(false);
    }
  };

  const completionRate =
    overview && overview.jobs.totalJobs > 0
      ? Math.round((overview.jobs.completedJobs / overview.jobs.totalJobs) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Lifecycle timings, category performance and repeat business. Totals and registrations live on Reports."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={exporting || loading}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <PageBody>
        <ErrorNote message={error} />

        <FilterBar>
          <Field label="Period">
            <select
              value={range}
              onChange={(e) => {
                // Marking the load here rather than inside the effect keeps the
                // state update in an event handler, where it belongs.
                setLoading(true);
                setRange(e.target.value as AnalyticsRange);
              }}
              className={selectClass}>
              {RANGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </FilterBar>

        {loading && <p className="text-sm text-fg-subtle">Loading…</p>}

        {!loading && overview && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Jobs"
                value={overview.jobs.totalJobs}
                caption={`${completionRate}% completed`}
              />
              <StatCard
                label="Commission earned"
                value={rupees(overview.revenue.totalCommission)}
                caption={`${rupees(overview.revenue.totalCompletedJobValue)} of completed work`}
                tone="success"
              />
              <StatCard
                label="Active bookings"
                value={overview.bookings.activeBookings}
                caption={`${overview.bookings.completedBookings} completed`}
              />
              <StatCard
                label="Open disputes"
                value={overview.disputes.openDisputes}
                caption={`${overview.disputes.totalDisputes} raised in total`}
                tone={overview.disputes.openDisputes > 0 ? 'warning' : 'default'}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Job → accepted"
                value={hours(bookings?.avgHoursJobToAcceptance)}
                caption="Average wait for a provider"
              />
              <StatCard
                label="Accepted → done"
                value={hours(bookings?.avgHoursAcceptanceToCompletion)}
                caption="Average time on site"
              />
              <StatCard
                label="Repeat customers"
                value={customers?.totals.repeatCustomers ?? 0}
                caption={`of ${customers?.totals.activeCustomers ?? 0} active this period`}
              />
              <StatCard
                label="Urgent jobs"
                value={jobs?.urgentJobs ?? 0}
                caption="Posted with the 6-hour window"
              />
            </div>
          </>
        )}

        {!loading && jobs && (
          <Card>
            <CardHeading title="Jobs posted" subtitle="Per day across the selected period" />
            <ColumnChart data={series(jobs.timeSeries.postedPerDay)} />
          </Card>
        )}

        {!loading && revenue && (
          <Card>
            <CardHeading title="Commission" subtitle="Platform earnings per day" />
            <ColumnChart data={series(revenue.commissionTimeSeries.perDay)} />
          </Card>
        )}

        {!loading && categories && (
          <>
            <SectionLabel>Categories</SectionLabel>
            {categories.data.length === 0 ? (
              <Empty message="No category activity in this period." />
            ) : (
              <>
                <Card>
                  <CardHeading title="Most jobs" />
                  <BarList
                    data={categories.mostPopular.map((row) => ({
                      label: `${row.icon ?? ''} ${row.categoryName}`.trim(),
                      value: row.totalJobs,
                    }))}
                  />
                </Card>

                <Table head={['Category', 'Jobs', 'Completed', 'Completion', 'Avg value']}>
                  {categories.data.map((row) => (
                    <tr key={row.categoryId}>
                      <td className="px-4 py-3">
                        <span className="mr-2">{row.icon ?? '🛠️'}</span>
                        {row.categoryName}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.totalJobs}</td>
                      <td className="px-4 py-3 tabular-nums">{row.completedJobs}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {Math.round(row.completionRate * 100)}%
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {rupees(toNumber(row.averageJobValue))}
                      </td>
                    </tr>
                  ))}
                </Table>
              </>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
