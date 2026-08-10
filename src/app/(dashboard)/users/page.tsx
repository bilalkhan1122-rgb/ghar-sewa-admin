'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage, usersApi, type User } from '@/lib/api';
import { Badge, Button, Empty, ErrorNote, Pagination, Table } from '@/components/ui';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((nextPage: number) => {
    setLoading(true);
    usersApi
      .list(nextPage, 20)
      .then((res) => {
        setUsers(res.data);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load users.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const setActive = async (user: User, isActive: boolean) => {
    setBusyId(user.id);
    setError(null);
    try {
      await usersApi.updateById(user.id, { isActive });
      load(page);
    } catch (err) {
      setError(
        apiErrorMessage(err, `Could not ${isActive ? 'reactivate' : 'deactivate'} this account.`),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
      </div>

      <ErrorNote message={error} />
      {loading && <p className="text-sm text-neutral-400">Loading…</p>}
      {!loading && users.length === 0 && <Empty message="No users found." />}

      {users.length > 0 && (
        <Table head={['Name', 'Contact', 'Role', 'Status', 'Joined', 'Actions']}>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{user.fullName}</p>
                <p className="font-mono text-xs text-neutral-400">{user.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">
                {user.email}
                <span className="block text-xs text-neutral-500">{user.phone}</span>
              </td>
              <td className="px-4 py-3 text-sm text-neutral-600">{user.role.toLowerCase()}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Badge status={user.status} />
                  {!user.isActive && <Badge status="SUSPENDED" />}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-neutral-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {user.isActive ? (
                  <Button
                    variant="danger"
                    disabled={busyId === user.id}
                    onClick={() => setActive(user, false)}>
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="success"
                    disabled={busyId === user.id}
                    onClick={() => setActive(user, true)}>
                    Reactivate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={load} />
    </>
  );
}
