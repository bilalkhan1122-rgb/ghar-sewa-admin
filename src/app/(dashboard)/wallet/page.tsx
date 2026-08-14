'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminApi,
  apiErrorMessage,
  fileUrl,
  toNumber,
  walletApi,
  type DashboardSummary,
  type TopUpRequest,
  type WalletTransaction,
  type WithdrawalRequest,
} from '@/lib/api';
import { DollarIcon } from '@/components/icons';
import { Badge, Button, CardHeading, Empty, ErrorNote, MetricCard, PageBody, PageHeader, rupees, SectionLabel, Table } from '@/components/ui';
import { useToast } from '@/components/toast';

type TopUpRow = TopUpRequest & {
  user: { id: string; fullName: string; email: string; phone: string };
};
type WithdrawalRow = WithdrawalRequest & {
  provider: { id: string; fullName: string; email: string; phone: string };
};

export default function WalletPage() {
  const toast = useToast();
  const [topUps, setTopUps] = useState<TopUpRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [ledger, setLedger] = useState<WalletTransaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      walletApi.admin.topUps(1, 20, 'PENDING').then((r) => setTopUps(r.data as TopUpRow[])),
      walletApi.admin
        .withdrawals(1, 20, 'PENDING')
        .then((r) => setWithdrawals(r.data as WithdrawalRow[])),
    ])
      .catch((err) => setError(apiErrorMessage(err, 'Could not load wallet requests.')))
      .finally(() => setLoading(false));

    // Ledger and headline revenue are read-only context; a failure here must not
    // block the approve/reject queues above.
    walletApi.admin
      .transactions({ page: 1, limit: 12 })
      .then((r) => setLedger(r.data))
      .catch(() => {});
    adminApi.dashboard.summary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (
    id: string,
    action: () => Promise<unknown>,
    failure: string,
    success: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      toast.success(success);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, failure));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Wallet &amp; Payouts"
        subtitle="Manage marketplace revenues, payouts and top-up approvals"
        metrics={
          <>
            <MetricCard
              label="Total Revenue"
              value={rupees(toNumber(summary?.finance.todayRevenue))}
              tone="green"
              icon={<DollarIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Platform Wallet"
              value={rupees(toNumber(summary?.finance.platformWalletBalance))}
              tone="violet"
              icon={<DollarIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Pending Top-ups"
              value={summary?.finance.pendingTopUps ?? 0}
              tone="amber"
              icon={<DollarIcon className="h-5 w-5" />}
            />
            <MetricCard
              label="Pending Withdrawals"
              value={summary?.finance.pendingWithdrawals ?? 0}
              tone="red"
              icon={<DollarIcon className="h-5 w-5" />}
            />
          </>
        }
      />

      <PageBody>      <ErrorNote message={error} />
      {loading && <p className="text-sm text-fg-subtle">Loading…</p>}

      <section className="space-y-3">
        <SectionLabel>
          Pending top-ups ({topUps.length})
        </SectionLabel>
        {topUps.length === 0 && !loading ? (
          <Empty message="No top-up requests waiting." />
        ) : (
          <Table head={['Customer', 'Amount', 'Method', 'Reference', 'Proof', 'Actions']}>
            {topUps.map((topUp) => (
              <tr key={topUp.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{topUp.user?.fullName}</p>
                  <p className="text-xs text-fg-muted">{topUp.user?.phone}</p>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">
                  {rupees(toNumber(topUp.amount))}
                </td>
                <td className="px-4 py-3 text-fg-muted">{topUp.paymentMethod}</td>
                <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                  {topUp.transactionReference ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {topUp.proofImage ? (
                    <a
                      href={fileUrl(topUp.proofImage)}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer text-sm text-brand underline">
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-fg-subtle">None</span>
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
                          'Top-up approved.',
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
                          'Top-up rejected.',
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
        <SectionLabel>
          Pending withdrawals ({withdrawals.length})
        </SectionLabel>
        {withdrawals.length === 0 && !loading ? (
          <Empty message="No withdrawal requests waiting." />
        ) : (
          <Table head={['Provider', 'Amount', 'Account', 'Status', 'Actions']}>
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{w.provider?.fullName}</p>
                  <p className="text-xs text-fg-muted">{w.provider?.phone}</p>
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">{rupees(toNumber(w.amount))}</td>
                <td className="px-4 py-3 text-sm text-fg-muted">
                  {w.accountName ?? '—'}
                  <span className="block font-mono text-xs text-fg-muted">
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
                          'Withdrawal approved.',
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
                          'Withdrawal marked as processing.',
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
                          'Withdrawal marked as paid.',
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
                          'Withdrawal rejected.',
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
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <CardHeading
            title="Transaction Ledger"
            subtitle="Live history of marketplace cash flow"
          />
          {ledger.length === 0 ? (
            <Empty message="No transactions recorded yet." />
          ) : (
            <div className="mt-4">
              <Table head={['Transaction ID', 'Type', 'Status', 'Amount', 'Balance after', 'Date']}>
                {ledger.map((t) => (
                  <tr key={t.id} className="transition hover:bg-surface-muted">
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      #{t.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted">
                      {t.type.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums">
                      {rupees(toNumber(t.amount))}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-fg-muted">
                      {rupees(toNumber(t.balanceAfter))}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted">
                      {new Date(t.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
}
