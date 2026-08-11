'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminApi,
  apiErrorMessage,
  toNumber,
  type AdminProviderListItem,
} from '@/lib/api';
import { Badge, Button, Empty, ErrorNote, inputClass, PageHeader, Pagination, rupees, Table } from '@/components/ui';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<AdminProviderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (nextPage: number, term = search) => {
      setLoading(true);
      adminApi.providers
        .list({ page: nextPage, limit: 20, search: term || undefined })
        .then((res) => {
          setProviders(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
        })
        .catch((err) => setError(apiErrorMessage(err, 'Could not load providers.')))
        .finally(() => setLoading(false));
    },
    [search],
  );

  useEffect(() => {
    load(1, '');
    // Initial load only; searching is explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suspend = async (provider: AdminProviderListItem) => {
    const reason = window.prompt(`Why are you suspending ${provider.fullName}?`);
    if (!reason?.trim()) return;
    setBusyId(provider.id);
    setError(null);
    try {
      await adminApi.providers.suspend(provider.id, reason.trim());
      load(page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not suspend this provider.'));
    } finally {
      setBusyId(null);
    }
  };

  const unsuspend = async (provider: AdminProviderListItem) => {
    setBusyId(provider.id);
    setError(null);
    try {
      await adminApi.providers.unsuspend(provider.id);
      load(page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reinstate this provider.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="Service providers and their verification status."
        actions={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(1);
            }}
            className="flex gap-2">
            <input
              placeholder="Search name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-64 ${inputClass}`}
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        }
      />

      <ErrorNote message={error} />
      {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
      {!loading && providers.length === 0 && <Empty message="No providers found." />}

      {providers.length > 0 && (
        <Table head={['Provider', 'Contact', 'Verification', 'Rating', 'Wallet', 'Actions']}>
          {providers.map((provider) => (
            <tr key={provider.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{provider.fullName}</p>
                <p className="text-xs text-fg-muted">
                  {provider.providerProfile?.hourlyRate
                    ? `${rupees(toNumber(provider.providerProfile.hourlyRate))}/hr`
                    : 'No rate set'}
                </p>
              </td>
              <td className="px-4 py-3 text-sm text-fg-muted">
                {provider.email}
                <span className="block text-xs text-fg-muted">{provider.phone}</span>
              </td>
              <td className="px-4 py-3">
                <Badge status={provider.verificationStatus} />
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-fg-muted">
                {provider.ratingSummary
                  ? `${toNumber(provider.ratingSummary.averageRating).toFixed(1)} ★ (${provider.ratingSummary.totalReviews})`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-fg-muted">
                {provider.wallet ? rupees(toNumber(provider.wallet.balance)) : '—'}
              </td>
              <td className="px-4 py-3">
                {provider.status === 'ACTIVE' ? (
                  <Button
                    variant="danger"
                    disabled={busyId === provider.id}
                    onClick={() => suspend(provider)}>
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    disabled={busyId === provider.id}
                    onClick={() => unsuspend(provider)}>
                    Reinstate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={(p) => load(p)} />
    </>
  );
}
