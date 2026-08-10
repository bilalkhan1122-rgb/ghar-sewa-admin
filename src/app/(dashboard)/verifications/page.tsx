'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  fileUrl,
  verificationApi,
  type VerificationRequestWithProvider,
} from '@/lib/api';
import { Badge, Button, Card, Empty, ErrorNote, Pagination } from '@/components/ui';

export default function VerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequestWithProvider[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback((nextPage: number) => {
    setLoading(true);
    verificationApi
      .adminList(nextPage, 10, 'PENDING')
      .then((res) => {
        setRequests(res.data);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load verification requests.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await verificationApi.approve(id);
      load(page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not approve this request.'));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = reasons[id]?.trim();
    if (!reason) {
      setError('Enter a rejection reason — the provider is shown this text.');
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await verificationApi.reject(id, reason);
      load(page);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reject this request.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Verifications</h1>
        <span className="text-sm text-neutral-500">{requests.length} pending</span>
      </div>

      <ErrorNote message={error} />

      {loading && <p className="text-sm text-neutral-400">Loading…</p>}
      {!loading && requests.length === 0 && <Empty message="No pending verification requests." />}

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{request.provider.fullName}</p>
                <p className="text-sm text-neutral-500">
                  {request.provider.email} · {request.provider.phone} ·{' '}
                  {request.provider.city?.name}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  CNIC <span className="font-mono">{request.cnicNumber}</span> · submitted{' '}
                  {new Date(request.submittedAt).toLocaleString()}
                </p>
                {request.provider.providerProfile?.bio && (
                  <p className="mt-2 max-w-prose text-sm text-neutral-600">
                    {request.provider.providerProfile.bio}
                  </p>
                )}
              </div>
              <Badge status={request.status} />
            </div>

            {/* The whole job here is comparing the selfie against the CNIC. */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Photo label="Face photo" src={fileUrl(request.facePhoto)} />
              <Photo label="CNIC front" src={fileUrl(request.cnicFrontImage)} />
              <Photo label="CNIC back" src={fileUrl(request.cnicBackImage)} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                placeholder="Rejection reason (required to reject)"
                value={reasons[request.id] ?? ''}
                onChange={(e) => setReasons((r) => ({ ...r, [request.id]: e.target.value }))}
                className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
              <Button
                variant="success"
                disabled={busyId === request.id}
                onClick={() => approve(request.id)}>
                Approve
              </Button>
              <Button
                variant="danger"
                disabled={busyId === request.id}
                onClick={() => reject(request.id)}>
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={load} />
    </>
  );
}

function Photo({ label, src }: { label: string; src?: string }) {
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-medium text-neutral-500">{label}</figcaption>
      {src ? (
        // Opens full size in a new tab — ID details are unreadable at thumbnail size.
        <a href={src} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            className="h-44 w-full rounded-lg border border-neutral-200 object-cover transition hover:opacity-90"
          />
        </a>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
          Not provided
        </div>
      )}
    </figure>
  );
}
