'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  apiErrorMessage,
  fileUrl,
  verificationApi,
  type VerificationRequestWithProvider,
} from '@/lib/api';
import {
  Badge,
  Button,
  CardHeading,
  Empty,
  ErrorNote,
  PageBody,
  PageHeader,
  inputClass,
} from '@/components/ui';

/**
 * Provider verifications, per the Figma "provider-verifications" frame: a
 * request list on the left, the selected submission's credentials and photos
 * on the right, with the approve/reject decision at the foot of the detail.
 */
export default function VerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequestWithProvider[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    verificationApi
      .adminList(1, 50, 'PENDING')
      .then((res) => {
        setError(null);
        setRequests(res.data);
        setSelectedId((current) =>
          current && res.data.some((r) => r.id === current) ? current : (res.data[0]?.id ?? null),
        );
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load verification requests.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const decide = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !reason.trim()) {
      setError('Enter a rejection reason — it is sent to the provider.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res =
        action === 'approve'
          ? await verificationApi.approve(selected.id)
          : await verificationApi.reject(selected.id, reason.trim());
      setNotice(res.message);
      setReason('');
      setLoading(true);
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'That decision could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Provider Verifications"
        subtitle="Review security, background checks, and professional certifications of local artisans in Pakistan"
      />

      <PageBody>
        <ErrorNote message={error} />
        {notice && (
          <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-fg ring-1 ring-ok-line">
            {notice}
          </p>
        )}
        {loading && <p className="text-sm text-fg-subtle">Loading…</p>}

        {!loading && requests.length === 0 && (
          <Empty message="No pending verification requests." />
        )}

        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[380px_1fr]">
            {/* Request list */}
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <CardHeading
                title="Verification Requests"
                subtitle={`${requests.length} provider${requests.length === 1 ? '' : 's'} awaiting approval`}
              />
              <ul className="mt-4 space-y-2.5">
                {requests.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-brand bg-brand-soft'
                            : 'border-line hover:border-line-strong hover:bg-surface-muted'
                        }`}>
                        <Avatar src={r.provider.profilePhoto} name={r.provider.fullName} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">
                            {r.provider.fullName}
                          </span>
                          <span className="block truncate text-xs text-fg-muted">
                            {r.provider.city?.name ?? r.provider.email}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-fg-subtle">
                            CNIC: {r.cnicNumber}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-[11px] text-fg-subtle">
                            {new Date(r.submittedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <Badge status={r.status} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Selected submission */}
            {selected && (
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar src={selected.provider.profilePhoto} name={selected.provider.fullName} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-2xl font-bold tracking-tight text-fg">
                        {selected.provider.fullName}
                      </h2>
                      <Badge status={selected.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {selected.provider.email}
                      {selected.provider.city?.name ? ` • ${selected.provider.city.name}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/users/${selected.providerId}`}
                    className="ml-auto cursor-pointer text-sm font-medium text-brand hover:underline">
                    Full profile
                  </Link>
                </div>

                <div className="my-5 border-t border-line" />

                <h3 className="text-base font-semibold tracking-tight text-fg">
                  Submitted Credentials
                </h3>
                <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-fg-muted">National Identity Number (CNIC)</dt>
                    <dd className="mt-1 font-semibold text-fg">{selected.cnicNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-fg-muted">Submitted Date</dt>
                    <dd className="mt-1 font-semibold text-fg">
                      {new Date(selected.submittedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                </dl>

                <h3 className="mt-6 text-base font-semibold tracking-tight text-fg">
                  Verification Photos
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Face Selfie', path: selected.facePhoto },
                    { label: 'CNIC Front', path: selected.cnicFrontImage },
                    { label: 'CNIC Back', path: selected.cnicBackImage },
                  ].map((doc) => (
                    <figure key={doc.label}>
                      <a
                        href={fileUrl(doc.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="cursor-pointer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fileUrl(doc.path)}
                          alt={doc.label}
                          className="h-36 w-full rounded-xl border border-line bg-surface-muted object-cover transition hover:opacity-90"
                        />
                      </a>
                      <figcaption className="mt-2 text-center text-sm text-fg-muted">
                        {doc.label}
                      </figcaption>
                    </figure>
                  ))}
                </div>

                <div className="my-5 border-t border-line" />

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <input
                    placeholder="Reason (required to reject)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={`min-w-[220px] flex-1 ${inputClass}`}
                  />
                  <Button variant="dark" disabled={busy} onClick={() => decide('reject')}>
                    Reject Application
                  </Button>
                  <Button variant="approve" disabled={busy} onClick={() => decide('approve')}>
                    Approve &amp; Activate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}

function Avatar({
  src,
  name,
  size = 'md',
}: {
  src: string | null;
  name: string;
  size?: 'md' | 'lg';
}) {
  const dims = size === 'lg' ? 'h-20 w-20 text-xl' : 'h-10 w-10 text-sm';
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileUrl(src)}
        alt=""
        className={`${dims} shrink-0 rounded-full border border-line object-cover`}
      />
    );
  }
  return (
    <span
      className={`${dims} grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand`}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
