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
  RadioRow,
  StarRating,
  StatTriple,
  Table,
  Toggle,
  rupees,
} from '@/components/ui';

/**
 * Provider management, per the Figma "provider-management" frame: a sticky
 * filter rail beside a grid of provider cards, with a table fallback behind
 * the Grid View toggle.
 *
 * Providers are fetched through `/admin/users?role=PROVIDER` rather than
 * `/admin/providers` — the users endpoint is the one that returns the city and
 * rating summary the cards display.
 */
type SortKey = 'rating' | 'recent' | 'city';

/**
 * A provider can be shut out two different ways: their verification is banned,
 * or the account itself is suspended/banned by an admin. The rail's "Banned"
 * row means both — matching only `verificationStatus` hid every provider who
 * had been suspended from the user side.
 */
const STATUS_FILTERS: { key: string; label: string; match: (p: AdminUserListItem) => boolean }[] = [
  { key: 'active', label: 'Active', match: (p) => p.verificationStatus === 'APPROVED' },
  { key: 'pending', label: 'Pending', match: (p) => p.verificationStatus === 'PENDING' },
  {
    key: 'banned',
    label: 'Banned',
    match: (p) =>
      p.verificationStatus === 'BANNED' || p.status === 'BANNED' || p.status === 'SUSPENDED',
  },
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checked, setChecked] = useState<Record<string, boolean>>({
    active: true,
    pending: true,
    banned: false,
  });
  const [sort, setSort] = useState<SortKey>('rating');
  const [city, setCity] = useState<string | null>(null);
  const [gridView, setGridView] = useState(true);

  const load = useCallback((nextPage: number) => {
    adminUsersApi
      .list({ page: nextPage, limit: 24, role: 'PROVIDER' })
      .then((res) => {
        setError(null);
        setProviders(res.data);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load providers.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  /** Cities come from the loaded providers — there is no city list endpoint. */
  const cities = useMemo(
    () => [...new Set(providers.map((p) => p.city?.name).filter(Boolean))] as string[],
    [providers],
  );

  // Status and city narrow the loaded page client-side; the API filters by a
  // single verificationStatus only, which cannot express "active OR pending".
  const visible = useMemo(() => {
    const wanted = STATUS_FILTERS.filter((s) => checked[s.key]);
    const list = providers.filter(
      (p) =>
        (wanted.length === 0 || wanted.some((s) => s.match(p))) &&
        (!city || p.city?.name === city),
    );
    return [...list].sort((a, b) => {
      if (sort === 'rating') {
        return toNumber(b.ratingSummary?.averageRating) - toNumber(a.ratingSummary?.averageRating);
      }
      if (sort === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (a.city?.name ?? '').localeCompare(b.city?.name ?? '');
    });
  }, [providers, checked, city, sort]);

  return (
    <>
      <PageHeader
        title="Provider Management"
        subtitle="Verify, monitor and manage home service experts across Pakistan"
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[270px_1fr]">
          <FilterPanel subtitle="Refine service provider list">
            <FilterSection label="Provider status">
              {STATUS_FILTERS.map((s) => (
                <CheckboxRow
                  key={s.key}
                  label={s.label}
                  checked={checked[s.key]}
                  onChange={(v) => setChecked((c) => ({ ...c, [s.key]: v }))}
                />
              ))}
            </FilterSection>

            <FilterSection label="Sort & filter by">
              <RadioRow label="Rating" checked={sort === 'rating'} onChange={() => setSort('rating')} />
              <RadioRow
                label="Recent registrations"
                checked={sort === 'recent'}
                onChange={() => setSort('recent')}
              />
              <RadioRow label="City" checked={sort === 'city'} onChange={() => setSort('city')} />
            </FilterSection>

            <FilterSection label="Active cities">
              <div className="flex flex-wrap gap-2">
                {cities.length === 0 && <p className="text-xs text-fg-subtle">No cities yet.</p>}
                {cities.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    active={city === c}
                    onClick={() => setCity(city === c ? null : c)}
                  />
                ))}
              </div>
            </FilterSection>
          </FilterPanel>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-fg">
                Showing {visible.length} partner{visible.length === 1 ? '' : 's'}
                {city ? ` in ${city}` : ''}
              </p>
              <Toggle label="Grid View" checked={gridView} onChange={setGridView} />
            </div>

            <ErrorNote message={error} />
            {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
            {!loading && visible.length === 0 && (
              <Empty message="No providers match these filters." />
            )}

            {!loading && visible.length > 0 && gridView && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            )}

            {!loading && visible.length > 0 && !gridView && (
              <Table head={['Provider', 'City', 'Status', 'Rating', 'Balance', '']}>
                {visible.map((p) => (
                  <tr key={p.id} className="transition hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${p.id}`}
                        className="cursor-pointer font-medium hover:text-brand">
                        {p.fullName}
                      </Link>
                      <span className="block text-xs text-fg-subtle">{p.email}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted">{p.city?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge status={p.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-fg-muted">
                      {toNumber(p.ratingSummary?.averageRating).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-fg-muted">
                      {rupees(toNumber(p.wallet?.balance))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/users/${p.id}`}
                        className="cursor-pointer text-sm font-medium text-brand hover:underline">
                        View
                      </Link>
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

function ProviderCard({ provider }: { provider: AdminUserListItem }) {
  const rating = toNumber(provider.ratingSummary?.averageRating);
  const reviews = provider.ratingSummary?.totalReviews ?? 0;

  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        {provider.profilePhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fileUrl(provider.profilePhoto)}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {provider.fullName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-fg">{provider.fullName}</p>
          <p className="truncate text-xs text-fg-muted">{provider.email}</p>
        </div>
        <Badge status={provider.verificationStatus} />
      </div>

      <div className="my-4 border-t border-line" />

      <StatTriple
        items={[
          { label: 'City', value: provider.city?.name ?? '—' },
          { label: 'Reviews', value: reviews },
          { label: 'Balance', value: rupees(toNumber(provider.wallet?.balance)) },
        ]}
      />

      <div className="mt-3">
        <StarRating value={rating} />
      </div>

      <Link
        href={`/users/${provider.id}`}
        className="mt-4 cursor-pointer rounded-lg bg-header px-3 py-2.5 text-center text-sm font-medium text-fg-on-dark transition hover:bg-header-card">
        View Profile
      </Link>
    </article>
  );
}
