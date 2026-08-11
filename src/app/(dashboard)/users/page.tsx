'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminUsersApi,
  apiErrorMessage,
  type AdminUserListItem,
  type AdminUserQuery,
  type BackendRole,
  type UserStatus,
  type VerificationStatus,
} from '@/lib/api';
import {
  Badge,
  Button,
  Empty,
  ErrorNote,
  Field,
  FilterBar,
  PageHeader,
  Pagination,
  Table,
  Tabs,
  inputClass,
  selectClass,
} from '@/components/ui';

/**
 * Tabs are presets over the same `/admin/users` query — each one just seeds a
 * different filter combination, so switching tabs and hand-filtering share one
 * code path.
 */
type TabValue = 'all' | 'customers' | 'providers' | 'admins' | 'suspended' | 'deleted';

const TAB_FILTERS: Record<TabValue, Partial<AdminUserQuery>> = {
  all: {},
  customers: { role: 'CUSTOMER' },
  providers: { role: 'PROVIDER' },
  admins: { role: 'ADMIN' },
  suspended: { status: 'SUSPENDED' },
  deleted: { deleted: 'true' },
};

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'customers', label: 'Customers' },
  { value: 'providers', label: 'Providers' },
  { value: 'admins', label: 'Admins' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
];

const ROLES: BackendRole[] = ['CUSTOMER', 'PROVIDER', 'ADMIN'];
const STATUSES: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'BANNED'];
const VERIFICATIONS: VerificationStatus[] = [
  'INCOMPLETE',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'BANNED',
];

export default function UsersPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft filter state lives separately so typing doesn't refetch on every key.
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [applied, setApplied] = useState(0);

  const load = useCallback(
    (nextPage: number) => {
      const query: AdminUserQuery = {
        page: nextPage,
        limit: 10,
        ...TAB_FILTERS[tab],
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(role ? { role: role as BackendRole } : {}),
        ...(status ? { status: status as UserStatus } : {}),
        ...(verification ? { verificationStatus: verification as VerificationStatus } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      };
      adminUsersApi
        .list(query)
        .then((res) => {
          setError(null);
          setUsers(res.data);
          setPage(res.meta.page);
          setTotalPages(res.meta.totalPages);
          setTotal(res.meta.total);
        })
        .catch((err) => setError(apiErrorMessage(err, 'Could not load users.')))
        .finally(() => setLoading(false));
    },
    // `applied` is the explicit "Apply filters" trigger; the draft fields above
    // are read at call time and deliberately excluded from the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, applied],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  /** Re-fetch triggers own the loading flag — the effect must not set state synchronously. */
  const reload = (fn: () => void) => {
    setLoading(true);
    fn();
  };

  const resetFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setVerification('');
    setDateFrom('');
    setDateTo('');
    reload(() => setApplied((n) => n + 1));
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Every customer, provider and admin account."
        actions={<span className="text-sm text-fg-muted">{total} total</span>}
      />

      <Tabs tabs={TABS} value={tab} onChange={(t) => reload(() => setTab(t))} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          reload(() => setApplied((n) => n + 1));
        }}>
        <FilterBar>
          <Field label="Search">
            <input
              placeholder="Name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-56 ${inputClass}`}
            />
          </Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
              <option value="">Any</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}>
              <option value="">Any</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Verification">
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className={selectClass}>
              <option value="">Any</option>
              {VERIFICATIONS.map((v) => (
                <option key={v} value={v}>
                  {v.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Joined from">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`cursor-pointer ${inputClass}`}
            />
          </Field>
          <Field label="Joined to">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`cursor-pointer ${inputClass}`}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Apply</Button>
            <Button type="button" variant="secondary" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </FilterBar>
      </form>

      <ErrorNote message={error} />
      {loading && <p className="text-sm text-fg-subtle">Loading…</p>}
      {!loading && users.length === 0 && <Empty message="No users match these filters." />}

      {!loading && users.length > 0 && (
        <Table head={['Name', 'Contact', 'Role', 'Status', 'Verification', 'Joined', '']}>
          {users.map((user) => (
            <tr key={user.id} className="transition hover:bg-surface-muted">
              <td className="px-4 py-3">
                <Link href={`/users/${user.id}`} className="cursor-pointer font-medium hover:text-brand">
                  {user.fullName}
                </Link>
                <p className="font-mono text-xs text-fg-subtle">{user.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3 text-sm text-fg-muted">
                {user.email}
                <span className="block text-xs text-fg-subtle">{user.phone}</span>
              </td>
              <td className="px-4 py-3 text-sm text-fg-muted">{user.role.toLowerCase()}</td>
              <td className="px-4 py-3">
                <Badge status={user.deletedAt ? 'REJECTED' : user.status} />
              </td>
              <td className="px-4 py-3">
                {user.role === 'PROVIDER' ? <Badge status={user.verificationStatus} /> : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-fg-muted">
                {new Date(user.createdAt).toLocaleDateString('en-GB')}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/users/${user.id}`}
                  className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand transition hover:bg-surface-muted">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={(p) => reload(() => load(p))} />
    </>
  );
}
