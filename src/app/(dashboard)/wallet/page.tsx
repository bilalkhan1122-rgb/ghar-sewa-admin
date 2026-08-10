'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  fileUrl,
  toNumber,
  walletApi,
  type TopUpRequest,
  type WithdrawalRequest,
} from '@/lib/api';
import { Badge, Button, Empty, ErrorNote, Table, rupees } from '@/components/ui';

type TopUpRow = TopUpRequest & {
  user: { id: string; fullName: string; email: string; phone: string };
};
type WithdrawalRow = WithdrawalRequest & {
  provider: { id: string; fullName: string; email: string; phone: string };
};

export default function WalletPage() {
  const [topUps, setTopUps] = useState<TopUpRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      walletApi.admin.topUps(1, 20, 'PENDING').then((r) => setTopUps(r.data as TopUpRow[])),
      walletApi.admin
        .withdrawals(1, 20, 'PENDING')
        .then((r) => setWithdrawals(r.data as WithdrawalRow[])),
    ])
      .catch((err) => setError(apiErrorMessage(err, 'Could not load wallet requests.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>, failure: string) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(apiErrorMessage(err, failure));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">Wallet</h1>
      <ErrorNote message={error} />
      {loading && <p className="text-sm text-neutral-400">Loading…</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Pending top-ups ({topUps.length})
        </h2>
        {topUps.length === 0 && !loading ? (
          <Empty message="No top-up requests waiting." />
        ) : (
          <Table head={['Customer', 'Amount', 'Method', 'Reference', 'Proof', 'Actions']}>
            {topUps.map((topUp) => (
              <tr key={topUp.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{topUp.user?.fullName}</p>
                  <p className="text-xs text-neutral-500">{topUp.user?.phone}</p>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  {rupees(toNumber(topUp.amount))}
                </td>
                <td className="px-4 py-3 text-neutral-600">{topUp.paymentMethod}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                  {topUp.transactionReference ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {topUp.proofImage ? (
                    <a
                      href={fileUrl(topUp.proofImage)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-orange-600 underline">
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400">None</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      disabled={busyId === topUp.id}
                      onClick={() =>
                        run(
                          topUp.id,
                          () => walletApi.admin.approveTopUp(topUp.id),
                          'Could not approve this top-up.',
                        )
                      }>
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === topUp.id}
                      onClick={() => {
                        const reason = window.prompt('Reason for rejecting this top-up?');
                        if (!reason?.trim()) return;
                        run(
                          topUp.id,
                          () => walletApi.admin.rejectTopUp(topUp.id, reason.trim()),
                          'Could not reject this top-up.',
                        );
                      }}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Pending withdrawals ({withdrawals.length})
        </h2>
        {withdrawals.length === 0 && !loading ? (
          <Empty message="No withdrawal requests waiting." />
        ) : (
          <Table head={['Provider', 'Amount', 'Account', 'Status', 'Actions']}>
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{w.provider?.fullName}</p>
                  <p className="text-xs text-neutral-500">{w.provider?.phone}</p>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">{rupees(toNumber(w.amount))}</td>
                <td className="px-4 py-3 text-sm text-neutral-600">
                  {w.accountName ?? '—'}
                  <span className="block font-mono text-xs text-neutral-500">
                    {w.accountNumber ?? ''}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge status={w.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Payouts move through approve → process → complete. */}
                    <Button
                      variant="success"
                      disabled={busyId === w.id}
                      onClick={() =>
                        run(
                          w.id,
                          () => walletApi.admin.approveWithdrawal(w.id),
                          'Could not approve this withdrawal.',
                        )
                      }>
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === w.id}
                      onClick={() =>
                        run(
                          w.id,
                          () => walletApi.admin.processWithdrawal(w.id),
                          'Could not mark this withdrawal as processing.',
                        )
                      }>
                      Processing
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busyId === w.id}
                      onClick={() =>
                        run(
                          w.id,
                          () => walletApi.admin.completeWithdrawal(w.id),
                          'Could not mark this withdrawal as paid.',
                        )
                      }>
                      Paid
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === w.id}
                      onClick={() => {
                        const reason = window.prompt('Reason for rejecting this withdrawal?');
                        if (!reason?.trim()) return;
                        run(
                          w.id,
                          () => walletApi.admin.rejectWithdrawal(w.id, reason.trim()),
                          'Could not reject this withdrawal.',
                        );
                      }}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
