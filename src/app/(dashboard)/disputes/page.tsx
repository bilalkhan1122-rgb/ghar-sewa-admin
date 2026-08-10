'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  disputesApi,
  toNumber,
  type DisputeListItem,
  type DisputeResolution,
} from '@/lib/api';
import { Badge, Button, Card, Empty, ErrorNote, Pagination, rupees } from '@/components/ui';

const RESOLUTIONS: { value: DisputeResolution; label: string; needsAmount?: boolean }[] = [
  { value: 'FULL_REFUND', label: 'Full refund' },
  { value: 'PARTIAL_REFUND', label: 'Partial refund', needsAmount: true },
  { value: 'REDO_WORK', label: 'Redo work' },
  { value: 'NO_REFUND', label: 'No refund' },
];

type Row = DisputeListItem & { job: { id: string; title: string } };

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback((nextPage: number) => {
    setLoading(true);
    disputesApi.admin
      .list({ page: nextPage, limit: 10, status: 'OPEN' })
      .then((res) => {
        setDisputes(res.data as Row[]);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load disputes.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const resolve = async (dispute: Row, resolution: DisputeResolution) => {
    const needsAmount = RESOLUTIONS.find((r) => r.value === resolution)?.needsAmount;
    const raw = amounts[dispute.id];
    const amount = raw ? Number(raw) : undefined;

    if (needsAmount) {
      const total = toNumber(dispute.booking.totalAmount);
      if (!amount || Number.isNaN(amount) || amount <= 0 || amount > total) {
        setError(`Enter a refund amount between 1 and ${rupees(total)}.`);
        return;
      }
    }

    setBusyId(dispute.id);
    setError(null);
    try {
      await disputesApi.admin.resolve(dispute.id, resolution, amount);
      load(page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resolve this dispute.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <span className="text-sm text-neutral-500">{disputes.length} open</span>
      </div>

      <ErrorNote message={error} />

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}
      {!loading && disputes.length === 0 && <Empty message="No open disputes." />}

      <div className="space-y-4">
        {disputes.map((dispute) => (
          <Card key={dispute.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{dispute.job?.title ?? 'Job'}</p>
                <p className="text-sm text-neutral-500">
                  Raised by {dispute.raisedBy?.fullName} ({dispute.raisedBy?.role?.toLowerCase()})
                  {' · against '}
                  {dispute.opponent?.fullName}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Booking value {rupees(toNumber(dispute.booking?.totalAmount))} ·{' '}
                  {new Date(dispute.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge status={dispute.status} />
            </div>

            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm">
              <p className="font-medium text-neutral-700">{dispute.reason}</p>
              {dispute.description && (
                <p className="mt-1 text-neutral-600">{dispute.description}</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="Refund amount (partial only)"
                value={amounts[dispute.id] ?? ''}
                onChange={(e) => setAmounts((a) => ({ ...a, [dispute.id]: e.target.value }))}
                className="w-56 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              {RESOLUTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="secondary"
                  disabled={busyId === dispute.id}
                  onClick={() => resolve(dispute, option.value)}>
                  {option.label}
                </Button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={load} />
    </>
  );
}
