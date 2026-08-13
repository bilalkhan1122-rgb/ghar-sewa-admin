'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  apiErrorMessage,
  jobsApi,
  toNumber,
  type AdminJob,
  type DashboardSummary,
} from '@/lib/api';
import { SearchIcon } from '@/components/icons';
import {
  Badge,
  Chip,
  CheckboxRow,
  Empty,
  ErrorNote,
  FilterPanel,
  FilterSection,
  PageBody,
  PageHeader,
  Pagination,
  Table,
  inputClass,
  rupees,
} from '@/components/ui';

/**
 * Job management, per the Figma "job-management" frame: a status filter rail
 * with live counts beside the job list.
 *
 * Counts come from the dashboard summary rather than a per-status query, so
 * the rail costs one request instead of six.
 */
const STATUSES: { key: string; label: string; count: (s: DashboardSummary) => number }[] = [
  { key: 'PENDING', label: 'Pending', count: (s) => s.jobs.pending },
  { key: 'IN_PROGRESS', label: 'In progress', count: (s) => s.jobs.active },
  { key: 'COMPLETED', label: 'Completed', count: (s) => s.jobs.completed },
  { key: 'CANCELLED', label: 'Cancelled', count: (s) => s.jobs.cancelled },
  { key: 'DISPUTED', label: 'Disputed', count: (s) => s.jobs.disputed },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allJobs, setAllJobs] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState(0);

  const load = useCallback(
    (nextPage: number) => {
      jobsApi
        .list({
          page: nextPage,
          limit: 20,
          sortOrder: 'desc',
          ...(search.trim() ? { search: search.trim() } : {}),
        })
        .then((res) => {
          setError(null);
          setJobs(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
          setTotal(res.meta.total);
        })
        .catch((err) => setError(apiErrorMessage(err, 'Could not load jobs.')))
        .finally(() => setLoading(false));
    },
    // `search` is read at call time; `applied` is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applied],
  );

  useEffect(() => {
    load(1);
    adminApi.dashboard.summary().then(setSummary).catch(() => {});
  }, [load]);

  const categories = useMemo(
    () => [...new Set(jobs.map((j) => j.category?.name).filter(Boolean))] as string[],
    [jobs],
  );

  // The API takes a single status; the rail allows several, so narrow here.
  const visible = useMemo(() => {
    const wanted = STATUSES.filter((s) => checked[s.key]).map((s) => s.key);
    return jobs.filter(
      (j) =>
        (allJobs || wanted.length === 0 || wanted.includes(j.status)) &&
        (!category || j.category?.name === category),
    );
  }, [jobs, checked, allJobs, category]);

  return (
    <>
      <PageHeader
        title="Job Management"
        subtitle="Track, audit and dispatch on-demand home service requests across the marketplace"
      />

      <PageBody>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[270px_1fr]">
          <FilterPanel title="Filter by Status" subtitle="Filter jobs by current stage">
            <FilterSection label="Status">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-fg">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={allJobs}
                    onChange={(e) => setAllJobs(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-brand"
                  />
                  All jobs
                </span>
                <span className="text-xs tabular-nums text-fg-subtle">{total}</span>
              </label>

              {STATUSES.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-2">
                  <CheckboxRow
                    label={s.label}
                    checked={!!checked[s.key]}
                    onChange={(v) => {
                      setChecked((c) => ({ ...c, [s.key]: v }));
                      if (v) setAllJobs(false);
                    }}
                  />
                  <span className="text-xs tabular-nums text-fg-subtle">
                    {summary ? s.count(summary) : '—'}
                  </span>
                </div>
              ))}
            </FilterSection>

            <FilterSection label="Category">
              <div className="flex flex-wrap gap-2">
                {categories.length === 0 && (
                  <p className="text-xs text-fg-subtle">No categories on this page.</p>
                )}
                {categories.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={category === c}
                    onClick={() => setCategory(category === c ? null : c)}
                  />
                ))}
              </div>
            </FilterSection>
          </FilterPanel>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-fg">
                Showing {visible.length} of {total} jobs
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoading(true);
                  setApplied((n) => n + 1);
                }}
                className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  placeholder="Search job title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-64 rounded-full pl-9 ${inputClass}`}
                />
              </form>
            </div>

            <ErrorNote message={error} />
            {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
            {!loading && visible.length === 0 && <Empty message="No jobs match these filters." />}

            {!loading && visible.length > 0 && (
              <Table head={['Job ID', 'Title', 'Status', 'Category', 'Customer', 'Posted', 'Price']}>
                {visible.map((job) => (
                  <tr key={job.id} className="transition hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      #{job.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium">{job.title}</td>
                    <td className="px-4 py-3">
                      <Badge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted">{job.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-fg-muted">
                      {job.customer?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">
                      {new Date(job.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {rupees(toNumber(job.offeredPrice))}
                    </td>
                  </tr>
                ))}
              </Table>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => {
                setLoading(true);
                load(p);
              }}
            />
          </div>
        </div>
      </PageBody>
    </>
  );
}
