'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  jobsApi,
  toNumber,
  type AdminJob,
  type AdminJobQuery,
} from '@/lib/api';
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  FilterBar,
  PageBody,
  PageHeader,
  Pagination,
  Table,
  Tabs,
  inputClass,
  rupees,
  selectClass,
} from '@/components/ui';

/** Tabs are presets over the same query — each seeds a different status filter. */
type TabValue = 'all' | 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';

const TAB_STATUS: Record<TabValue, string | undefined> = {
  all: undefined,
  pending: 'PENDING',
  active: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  disputed: 'DISPUTED',
};

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'disputed', label: 'Disputed' },
];

export default function JobsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState(0);

  const load = useCallback(
    (nextPage: number) => {
      const query: AdminJobQuery = {
        page: nextPage,
        limit: 10,
        sortOrder,
        ...(TAB_STATUS[tab] ? { status: TAB_STATUS[tab] } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      };
      jobsApi
        .list(query)
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
    // Draft fields are read at call time; `applied` is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, applied],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  /** Re-fetch triggers own the loading flag — the effect must not set state synchronously. */
  const reload = (fn: () => void) => {
    setLoading(true);
    fn();
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Every service request posted on the marketplace."
        actions={<span className="text-sm text-fg-on-dark-muted">{total} total</span>}
      />

      <PageBody>
        <Tabs tabs={TABS} value={tab} onChange={(t) => reload(() => setTab(t))} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            reload(() => setApplied((n) => n + 1));
          }}>
          <FilterBar>
            <Field label="Search">
              <input
                placeholder="Title or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-56 ${inputClass}`}
              />
            </Field>
            <Field label="Posted from">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`cursor-pointer ${inputClass}`}
              />
            </Field>
            <Field label="Posted to">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`cursor-pointer ${inputClass}`}
              />
            </Field>
            <Field label="Order">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className={selectClass}>
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit">Apply</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  reload(() => {
                    setSearch('');
                    setDateFrom('');
                    setDateTo('');
                    setSortOrder('desc');
                    setApplied((n) => n + 1);
                  })
                }>
                Reset
              </Button>
            </div>
          </FilterBar>
        </form>

        <ErrorNote message={error} />
        {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
        {!loading && jobs.length === 0 && <Empty message="No jobs match these filters." />}

        {!loading && jobs.length > 0 && (
          <Table head={['Job ID', 'Title', 'Status', 'Category', 'Customer', 'Posted', 'Price']}>
            {jobs.map((job) => (
              <tr key={job.id} className="transition hover:bg-surface-muted">
                <td className="px-4 py-3 font-mono text-xs text-fg-muted">#{job.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-medium">{job.title}</td>
                <td className="px-4 py-3">
                  <Badge status={job.status} />
                </td>
                <td className="px-4 py-3 text-sm text-fg-muted">{job.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-fg-muted">
                  {job.customer?.fullName ?? '—'}
                  <span className="block text-xs text-fg-subtle">{job.customer?.phone}</span>
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

        <Pagination page={page} totalPages={totalPages} onChange={(p) => reload(() => load(p))} />
      </PageBody>
    </>
  );
}
