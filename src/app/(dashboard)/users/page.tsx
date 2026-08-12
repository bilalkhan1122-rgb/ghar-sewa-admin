'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  adminUsersApi,
  apiErrorMessage,
  fileUrl,
  toNumber,
  type AdminUserListItem,
} from '@/lib/api';
import { SearchIcon } from '@/components/icons';
import {
  Badge,
  CheckboxRow,
  Empty,
  ErrorNote,
  FilterPanel,
  FilterSection,
  PageBody,
  PageHeader,
  Pagination,
  RadioRow,
  inputClass,
  rupees,
  selectClass,
} from '@/components/ui';

/**
 * Customer management, per the Figma "customer-management" frame: filter rail
 * plus a grid of customer cards.
 *
 * The card's third stat is "Total spent" rather than the mockup's "Jobs
 * posted" — the list endpoint returns spend but not a per-customer job count,
 * and one detail request per card would be far too chatty.
 */
type SortKey = 'spend' | 'balance' | 'recent';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showActive, setShowActive] = useState(true);
  const [showBanned, setShowBanned] = useState(false);
  const [sort, setSort] = useState<SortKey>('spend');
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState(0);

  const load = useCallback(
    (nextPage: number) => {
      adminUsersApi
        .list({
          page: nextPage,
          limit: 24,
          role: 'CUSTOMER',
          ...(search.trim() ? { search: search.trim() } : {}),
        })
        .then((res) => {
          setError(null);
          setCustomers(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
          setTotal(res.meta.total);
        })
        .catch((err) => setError(apiErrorMessage(err, 'Could not load customers.')))
        .finally(() => setLoading(false));
    },
    // `search` is read at call time; `applied` is the explicit trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applied],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const cities = useMemo(
    () => [...new Set(customers.map((c) => c.city?.name).filter(Boolean))] as string[],
    [customers],
  );

  // Status and city narrow the loaded page client-side — the API takes a single
  // status, which cannot express "active OR banned".
  const visible = useMemo(() => {
    const list = customers.filter((c) => {
      const banned = c.status === 'BANNED' || c.status === 'SUSPENDED' || !!c.deletedAt;
      if (banned && !showBanned) return false;
      if (!banned && !showActive) return false;
      return !city || c.city?.name === city;
    });
    return [...list].sort((a, b) => {
      if (sort === 'spend') return toNumber(b.totalSpent) - toNumber(a.totalSpent);
      if (sort === 'balance')
        return toNumber(b.wallet?.balance) - toNumber(a.wallet?.balance);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [customers, showActive, showBanned, city, sort]);

  const resetAll = () => {
    setShowActive(true);
    setShowBanned(false);
    setSort('spend');
    setCity('');
    setSearch('');
    setLoading(true);
    setApplied((n) => n + 1);
  };

  return (
    <>
      <PageHeader
        title="Customer Management"
        subtitle="Manage consumer user accounts, wallet balances, and operation tracking across Pakistan"
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_1fr]">
          <FilterPanel>
            <div className="-mt-9 mb-1 flex justify-end">
              <button
                type="button"
                onClick={resetAll}
                className="cursor-pointer text-sm font-medium text-brand hover:underline">
                Reset All
              </button>
            </div>

            <FilterSection label="Account status">
              <CheckboxRow label="Active accounts" checked={showActive} onChange={setShowActive} />
              <CheckboxRow label="Banned accounts" checked={showBanned} onChange={setShowBanned} />
            </FilterSection>

            <FilterSection label="Sort by activity">
              <RadioRow label="Highest spend" checked={sort === 'spend'} onChange={() => setSort('spend')} />
              <RadioRow
                label="Highest wallet balance"
                checked={sort === 'balance'}
                onChange={() => setSort('balance')}
              />
              <RadioRow
                label="Recently joined"
                checked={sort === 'recent'}
                onChange={() => setSort('recent')}
              />
            </FilterSection>

            <FilterSection label="Filter by city">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`w-full ${selectClass}`}>
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterSection>
          </FilterPanel>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-fg">
                Showing {visible.length} of {total} registered customers
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
                  placeholder="Search customer name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-64 rounded-full pl-9 ${inputClass}`}
                />
              </form>
            </div>

            <ErrorNote message={error} />
            {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
            {!loading && visible.length === 0 && (
              <Empty message="No customers match these filters." />
            )}

            {!loading && visible.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((c) => (
                  <CustomerCard key={c.id} customer={c} />
                ))}
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} onChange={load} />
          </div>
        </div>
      </PageBody>
    </>
  );
}

function CustomerCard({ customer }: { customer: AdminUserListItem }) {
  const rows = [
    { label: 'Wallet balance', value: rupees(toNumber(customer.wallet?.balance)) },
    { label: 'Total spent', value: rupees(toNumber(customer.totalSpent)) },
    {
      label: 'Joined date',
      value: new Date(customer.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    },
  ];

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        {customer.profilePhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fileUrl(customer.profilePhoto)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {customer.fullName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-fg">{customer.fullName}</p>
          <p className="truncate text-xs text-fg-muted">{customer.city?.name ?? customer.email}</p>
        </div>
        <Badge status={customer.deletedAt ? 'REJECTED' : customer.status} />
      </div>

      <div className="my-4 border-t border-line" />

      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-fg-muted">{r.label}</dt>
            <dd className="font-semibold tabular-nums text-fg">{r.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={`/users/${customer.id}`}
        className="mt-4 cursor-pointer rounded-lg bg-header px-3 py-2.5 text-center text-sm font-medium text-fg-on-dark transition hover:bg-header-card">
        View Profile
      </Link>
    </article>
  );
}
