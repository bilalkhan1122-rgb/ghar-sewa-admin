'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  adminUsersApi,
  apiErrorMessage,
  fileUrl,
  toNumber,
  verificationApi,
  type AdminUserDetail,
  type VerificationRequestWithProvider,
} from '@/lib/api';
import { Badge, Button, Card, DetailRow, ErrorNote, inputClass, PageBody, PageHeader, rupees, SectionLabel, StatCard } from '@/components/ui';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [request, setRequest] = useState<VerificationRequestWithProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    adminUsersApi
      .getById(id)
      .then(setUser)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this user.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // Fetch the provider's submitted documents whatever their current status —
  // an admin still needs to see the CNIC and face photo of an already-approved
  // provider, not only of one sitting in the pending queue.
  useEffect(() => {
    if (user?.role !== 'PROVIDER') return;
    let cancelled = false;
    verificationApi
      .adminList(1, 20, undefined, user.id)
      .then((res) => {
        if (cancelled) return;
        const latest = [...res.data].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        )[0];
        setRequest(latest ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  /** Runs an admin action, surfacing its message and refreshing the record. */
  const run = async (action: () => Promise<{ message: string }>, needsReason = false) => {
    if (needsReason && !reason.trim()) {
      setError('Enter a reason first — it is recorded in the audit log and sent to the user.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await action();
      setNotice(res.message);
      setReason('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'That action failed.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-fg-subtle">Loading…</p>;
  if (!user) return <ErrorNote message={error ?? 'User not found.'} />;

  const isProvider = user.role === 'PROVIDER';
  // Only surface the request block while this provider is actually awaiting review.
  const awaitingReview = isProvider && user.verificationStatus === 'PENDING';
  const profile = user.providerProfile;

  return (
    <>
      <PageHeader
        title={user.fullName}
        subtitle={`${user.role.toLowerCase()} · joined ${new Date(user.createdAt).toLocaleDateString('en-GB')}`}
        actions={
          <Link
            href="/users"
            className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-fg-on-dark-muted transition hover:bg-header-card hover:text-fg-on-dark">
            ← Back to users
          </Link>
        }
      />

      <PageBody>
      <ErrorNote message={error} />
      {notice && (
        <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok-fg ring-1 ring-ok-line">
          {notice}
        </p>
      )}

      {user.profilePhoto && (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
          <a href={fileUrl(user.profilePhoto)} target="_blank" rel="noreferrer" className="cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl(user.profilePhoto)}
              alt={`${user.fullName} profile photo`}
              className="h-20 w-20 rounded-full border border-line object-cover transition hover:opacity-90"
            />
          </a>
          <div>
            <p className="text-sm font-medium">Profile photo</p>
            <p className="text-xs text-fg-subtle">Click to open the full-size image.</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jobs posted" value={user.stats.jobsPosted} />
        <StatCard label="Bookings" value={user.stats.bookings} />
        <StatCard
          label="Disputes"
          value={user.stats.disputes}
          tone={user.stats.disputes > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Penalties"
          value={user.stats.penalties}
          tone={user.stats.penalties > 0 ? 'warning' : 'default'}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <SectionLabel>Account</SectionLabel>
          <dl className="mt-2 divide-y divide-line">
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Phone" value={user.phone} />
            <DetailRow label="City" value={user.city?.name} />
            <DetailRow label="Address" value={user.address} />
            <DetailRow label="Status" value={<Badge status={user.status} />} />
            <DetailRow
              label="Verification"
              value={isProvider ? <Badge status={user.verificationStatus} /> : '—'}
            />
            <DetailRow label="Profile complete" value={user.profileCompleted ? 'Yes' : 'No'} />
            <DetailRow
              label="Deleted"
              value={user.deletedAt ? new Date(user.deletedAt).toLocaleString('en-GB') : 'No'}
            />
          </dl>
        </Card>

        <Card>
          <SectionLabel>Wallet</SectionLabel>
          <dl className="mt-2 divide-y divide-line">
            <DetailRow label="Balance" value={rupees(toNumber(user.wallet?.balance))} />
            <DetailRow label="Held" value={rupees(toNumber(user.wallet?.heldBalance))} />
            <DetailRow label="Wallet status" value={user.wallet?.status ?? '—'} />
            <DetailRow label="Total spent" value={rupees(toNumber(user.totalSpent))} />
            <DetailRow label="Total top-ups" value={rupees(toNumber(user.totalTopups))} />
            <DetailRow
              label="Rating"
              value={
                user.ratingSummary
                  ? `${Number(user.ratingSummary.averageRating).toFixed(1)} (${user.ratingSummary.totalReviews} reviews)`
                  : '—'
              }
            />
          </dl>
        </Card>
      </section>

      {isProvider && profile && (
        <Card>
          <SectionLabel>Provider profile</SectionLabel>
          <dl className="mt-2 grid grid-cols-1 gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
            <DetailRow label="Hourly rate" value={rupees(toNumber(profile.hourlyRate))} />
            <DetailRow label="Experience" value={profile.experienceYears ? `${profile.experienceYears} yrs` : '—'} />
            <DetailRow label="Service area" value={profile.serviceLocation} />
            <DetailRow label="Radius" value={profile.serviceRadius ? `${profile.serviceRadius} km` : '—'} />
            <DetailRow label="CNIC" value={profile.cnicNumber} />
            <DetailRow
              label="Categories"
              value={profile.categories.map((c) => c.category.name).join(', ') || '—'}
            />
          </dl>
          {profile.bio && <p className="mt-3 max-w-prose text-sm text-fg-muted">{profile.bio}</p>}
          {profile.galleryImages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.galleryImages.map((img) => (
                <a
                  key={img.id}
                  href={fileUrl(img.imageUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl(img.imageUrl)}
                    alt="Provider work sample"
                    className="h-24 w-24 rounded-lg border border-line object-cover transition hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {request && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Identity documents</SectionLabel>
            <Badge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Submitted {new Date(request.submittedAt).toLocaleString('en-GB')} · CNIC{' '}
            {request.cnicNumber}
            {request.reviewedAt &&
              ` · reviewed ${new Date(request.reviewedAt).toLocaleString('en-GB')}`}
          </p>
          {request.rejectionReason && (
            <p className="mt-2 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad-fg ring-1 ring-bad-line">
              Rejection reason: {request.rejectionReason}
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Face photo', path: request.facePhoto },
              { label: 'CNIC front', path: request.cnicFrontImage },
              { label: 'CNIC back', path: request.cnicBackImage },
            ].map((doc) => (
              <figure key={doc.label} className="space-y-1">
                <figcaption className="text-xs font-medium text-fg-muted">{doc.label}</figcaption>
                <a href={fileUrl(doc.path)} target="_blank" rel="noreferrer" className="cursor-pointer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl(doc.path)}
                    alt={doc.label}
                    className="h-40 w-full rounded-lg border border-line object-cover transition hover:opacity-90"
                  />
                </a>
              </figure>
            ))}
          </div>
          {/* Documents stay visible at any status; only the decision is gated. */}
          {awaitingReview ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant="success"
                disabled={busy}
                onClick={() => run(() => verificationApi.approve(request.id))}>
                Approve verification
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => run(() => verificationApi.reject(request.id, reason.trim()), true)}>
                Reject
              </Button>
              <input
                placeholder="Reason (required to reject)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`min-w-[240px] flex-1 ${inputClass}`}
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-fg-subtle">
              This request has already been reviewed — documents are shown for reference only.
            </p>
          )}
        </Card>
      )}

      <Card>
        <SectionLabel>Admin actions</SectionLabel>
        <p className="mt-1 text-sm text-fg-muted">
          Every action below is written to the audit log and notifies the user.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {user.status === 'SUSPENDED' ? (
            <Button
              variant="success"
              disabled={busy}
              onClick={() => run(() => adminUsersApi.unsuspend(user.id))}>
              Unsuspend
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={busy || user.role === 'ADMIN'}
              onClick={() => run(() => adminUsersApi.suspend(user.id, reason.trim()), true)}>
              Suspend
            </Button>
          )}

          {user.deletedAt ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => adminUsersApi.restore(user.id))}>
              Restore account
            </Button>
          ) : (
            <Button
              variant="danger"
              disabled={busy || user.role === 'ADMIN'}
              onClick={() => run(() => adminUsersApi.softDelete(user.id, reason.trim()), true)}>
              Delete account
            </Button>
          )}

          {isProvider && user.verificationStatus !== 'BANNED' && (
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => run(() => verificationApi.ban(user.id))}>
              Ban provider
            </Button>
          )}
          {isProvider && user.verificationStatus === 'BANNED' && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => run(() => verificationApi.unban(user.id))}>
              Unban provider
            </Button>
          )}

          <input
            placeholder="Reason (required for suspend / delete)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`min-w-[260px] flex-1 ${inputClass}`}
          />
        </div>
        {user.role === 'ADMIN' && (
          <p className="mt-2 text-xs text-fg-subtle">
            Admin accounts cannot be suspended or deleted.
          </p>
        )}
        <button
          onClick={() => router.refresh()}
          className="mt-3 cursor-pointer text-sm text-brand hover:underline">
          Refresh
        </button>
      </Card>
      </PageBody>
    </>
  );
}
