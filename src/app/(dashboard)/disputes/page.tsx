'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  apiErrorMessage,
  disputesApi,
  toNumber,
  type DisputeListItem,
  type DisputeResolution,
  type DisputeStatus,
} from '@/lib/api';
import { DisputeIcon } from '@/components/icons';
import {
  Badge,
  Button,
  CheckboxRow,
  Empty,
  ErrorNote,
  FilterPanel,
  FilterSection,
  PageBody,
  PageHeader,
  inputClass,
  rupees,
  selectClass,
} from '@/components/ui';

/**
 * Dispute resolution, per the Figma "dispute-resolution" frame: a status filter
 * rail beside a stack of dispute cards, each expanding into the resolve /
 * reject controls the backend requires.
 */
const STATUS_FILTERS: { key: DisputeStatus; label: string }[] = [
  { key: 'OPEN', label: 'Active disputes' },
  { key: 'UNDER_REVIEW', label: 'Under investigation' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const RESOLUTIONS: { value: DisputeResolution; label: string }[] = [
  { value: 'FULL_REFUND', label: 'Full refund' },
  { value: 'PARTIAL_REFUND', label: 'Partial refund' },
  { value: 'REDO_WORK', label: 'Redo work' },
  { value: 'NO_REFUND', label: 'No refund' },
];

type Row = DisputeListItem & { _count: { evidences: number } };

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [checked, setChecked] = useState<Record<string, boolean>>({
    OPEN: true,
    UNDER_REVIEW: true,
    RESOLVED: false,
    REJECTED: false,
  });

  const load = useCallback(() => {
    disputesApi.admin
      .list({ page: 1, limit: 50 })
      .then((res) => {
        setError(null);
        setDisputes(res.data);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load disputes.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The API filters by a single status; the rail allows several at once, so the
  // narrowing happens here.
  const visible = useMemo(
    () => disputes.filter((d) => checked[d.status] ?? false),
    [disputes, checked],
  );

  const run = async (id: string, action: () => Promise<{ message: string }>) => {
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      const res = await action();
      setNotice(res.message);
      setOpenId(null);
      setLoading(true);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'That action failed.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Dispute Resolution"
        subtitle="Mediate payment issues, task quality disputes, or service delays between customers and providers"
      />

      <PageBody>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[270px_1fr]">
          <FilterPanel>
            <FilterSection label="Dispute status">
              {STATUS_FILTERS.map((s) => (
                <CheckboxRow
                  key={s.key}
                  label={s.label}
                  checked={checked[s.key]}
                  onChange={(v) => setChecked((c) => ({ ...c, [s.key]: v }))}
                />
              ))}
            </FilterSection>
            <FilterSection label="Amount tier">
              <p className="text-xs text-fg-subtle">All amounts in Pakistani Rupees.</p>
            </FilterSection>
          </FilterPanel>

          <div className="min-w-0 space-y-4">
            <ErrorNote message={error} />
            {notice && (
              <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-fg ring-1 ring-ok-line">
                {notice}
              </p>
            )}
            {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
            {!loading && visible.length === 0 && (
              <Empty message="No disputes match these filters." />
            )}

            {!loading &&
              visible.map((d) => (
                <article
                  key={d.id}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-bad-soft text-bad-fg">
                      <DisputeIcon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-sm font-semibold text-fg">
                      Dispute #{d.id.slice(0, 8)}
                    </span>
                    <span className="text-sm text-fg-subtle">
                      Opened on{' '}
                      {new Date(d.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="ml-auto">
                      <Badge status={d.status} />
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold tracking-tight text-fg">{d.job.title}</h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
                    <span>
                      Raised by: <span className="font-medium text-fg">{d.raisedBy.fullName}</span>
                    </span>
                    <span className="text-fg-subtle">•</span>
                    <span>
                      Against: <span className="font-medium text-fg">{d.opponent.fullName}</span>
                    </span>
                    <span className="text-fg-subtle">•</span>
                    <span>
                      Escalated value:{' '}
                      <span className="font-semibold text-bad-fg">
                        {rupees(toNumber(d.booking.totalAmount))}
                      </span>
                    </span>
                  </div>

                  <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-fg-muted">
                    <span className="font-medium text-fg">Reason:</span> {d.reason}
                    {d.description ? ` — ${d.description}` : ''}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-fg-subtle">
                      {d._count?.evidences ?? d.evidenceCount} evidence file
                      {(d._count?.evidences ?? d.evidenceCount) === 1 ? '' : 's'}
                    </span>
                    <Button
                      variant="dark"
                      onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                      {openId === d.id ? 'Close' : 'View Dispute Detail'}
                    </Button>
                  </div>

                  {openId === d.id && (
                    <ResolvePanel
                      busy={busy === d.id}
                      onResolve={(resolution, amount, note) =>
                        run(d.id, () =>
                          disputesApi.admin.resolve(d.id, resolution, amount, note),
                        )
                      }
                      onReject={(reason) =>
                        run(d.id, () => disputesApi.admin.reject(d.id, reason))
                      }
                      onStatus={(status, note) =>
                        run(d.id, async () => {
                          await disputesApi.admin.updateStatus(d.id, status, note);
                          return { message: 'Status updated.' };
                        })
                      }
                    />
                  )}
                </article>
              ))}
          </div>
        </div>
      </PageBody>
    </>
  );
}

function ResolvePanel({
  busy,
  onResolve,
  onReject,
  onStatus,
}: {
  busy: boolean;
  onResolve: (resolution: DisputeResolution, amount: number | undefined, note: string) => void;
  onReject: (reason: string) => void;
  onStatus: (status: DisputeStatus, note: string) => void;
}) {
  const [resolution, setResolution] = useState<DisputeResolution>('FULL_REFUND');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const needsAmount = resolution === 'FULL_REFUND' || resolution === 'PARTIAL_REFUND';

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            Resolution
          </span>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as DisputeResolution)}
            className={selectClass}>
            {RESOLUTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {needsAmount && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              Refund amount
            </span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Rs"
              className={`w-32 ${inputClass}`}
            />
          </label>
        )}

        <label className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            Note
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shared with both parties"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="approve"
          disabled={busy}
          onClick={() => onResolve(resolution, amount ? Number(amount) : undefined, note)}>
          Resolve dispute
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onStatus('UNDER_REVIEW', note)}>
          Mark under investigation
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => onReject(note)}>
          Reject dispute
        </Button>
      </div>
      <p className="text-xs text-fg-subtle">
        Rejecting requires a note — it is sent to the party who raised the dispute.
      </p>
    </div>
  );
}
