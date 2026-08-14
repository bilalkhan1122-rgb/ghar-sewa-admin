'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminAccountsApi,
  apiErrorMessage,
  type AccessLevel,
  type AccessMap,
  type AdminAccount,
  type AdminModule,
  type AdminModuleKey,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/toast';
import {
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  inputClass,
  PageBody,
  PageHeader,
  SectionLabel,
  selectClass,
} from '@/components/ui';

const LEVELS: { value: AccessLevel; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'view', label: 'View only' },
  { value: 'full', label: 'Full access' },
];

const emptyDraft = { fullName: '', email: '', phone: '', password: '' };

export default function AdminAccountsPage() {
  const toast = useToast();
  const { user, isSuperAdmin } = useAuth();

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftSuper, setDraftSuper] = useState(false);
  const [draftAccess, setDraftAccess] = useState<Partial<AccessMap>>({});
  const [editing, setEditing] = useState<AdminAccount | null>(null);

  const load = useCallback(() => {
    Promise.all([adminAccountsApi.list(), adminAccountsApi.modules()])
      .then(([list, mods]) => {
        setAccounts(list);
        setModules(mods);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load admin accounts.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    if (draft.fullName.trim().length < 2 || !draft.email.trim() || !draft.phone.trim()) {
      toast.error('Enter a name, email and phone number.');
      return;
    }
    if (draft.password.length < 8) {
      toast.error('The password must be at least 8 characters.');
      return;
    }
    if (!draftSuper && Object.values(draftAccess).every((l) => !l || l === 'none')) {
      toast.error('Grant at least one module, or make this account a super admin.');
      return;
    }
    setCreating(true);
    try {
      const res = await adminAccountsApi.create({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        password: draft.password,
        isSuperAdmin: draftSuper,
        access: draftAccess,
      });
      toast.success(res.message);
      setDraft(emptyDraft);
      setDraftSuper(false);
      setDraftAccess({});
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not create the admin account.'));
    } finally {
      setCreating(false);
    }
  };

  const saveAccess = async (account: AdminAccount, nextSuper: boolean, next: AccessMap) => {
    setBusyId(account.id);
    try {
      const res = await adminAccountsApi.update(account.id, {
        isSuperAdmin: nextSuper,
        access: nextSuper ? undefined : next,
      });
      toast.success(res.message);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update this admin.'));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (account: AdminAccount) => {
    setBusyId(account.id);
    try {
      const res = await adminAccountsApi.update(account.id, { isActive: !account.isActive });
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change this admin.'));
    } finally {
      setBusyId(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <>
        <PageHeader title="Admin Accounts" subtitle="Manage who can sign in to this dashboard" />
        <PageBody>
          <ErrorNote message="Only a super admin can manage admin accounts." />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Admin Accounts"
        subtitle="Create dashboard users and choose exactly which modules each one can reach"
      />

      <PageBody>
        <ErrorNote message={error} />

        <Card>
          <SectionLabel>Create an admin</SectionLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Full name">
              <input
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </Field>
            <Field label="Initial password">
              <input
                type="text"
                autoComplete="off"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </Field>
          </div>
          {/* Shown in the clear on purpose: you have to be able to read it back
              to the person you are creating the account for. */}
          <p className="mt-2 text-xs text-fg-subtle">
            Share this password with them directly — they can change it on their own profile page.
            At least 8 characters, including a letter and a number.
          </p>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftSuper}
              onChange={(e) => setDraftSuper(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
            />
            <span className="font-medium">Super admin</span>
            <span className="text-fg-subtle">— full access to every module, now and in future</span>
          </label>

          {!draftSuper && (
            <AccessGrid
              modules={modules}
              value={draftAccess}
              onChange={(key, level) => setDraftAccess({ ...draftAccess, [key]: level })}
            />
          )}

          <div className="mt-4">
            <Button disabled={creating} onClick={create}>
              {creating ? 'Creating…' : 'Create admin'}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionLabel>Admins</SectionLabel>
          {loading && <p className="mt-3 text-sm text-fg-subtle">Loading…</p>}
          {!loading && accounts.length === 0 && <Empty message="No admin accounts yet." />}

          <div className="mt-3 space-y-3">
            {accounts.map((account) => {
              const isSelf = account.id === user?.id;
              const open = editing?.id === account.id;
              return (
                <div key={account.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {account.fullName}
                        {isSelf && <span className="ml-2 text-xs text-fg-subtle">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-fg-subtle">{account.email}</p>
                      <p className="mt-1 text-xs">
                        {account.isSuperAdmin ? (
                          <span className="rounded-full bg-badge-violet px-2 py-0.5 font-medium text-badge-violet-fg">
                            Super admin
                          </span>
                        ) : (
                          <span className="text-fg-muted">
                            {summarise(account.access, modules)}
                          </span>
                        )}
                        {!account.isActive && (
                          <span className="ml-2 rounded-full bg-badge-red px-2 py-0.5 font-medium text-badge-red-fg">
                            Deactivated
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        disabled={busyId === account.id || isSelf}
                        onClick={() => setEditing(open ? null : account)}>
                        {open ? 'Cancel' : 'Edit access'}
                      </Button>
                      <Button
                        variant={account.isActive ? 'danger' : 'success'}
                        disabled={busyId === account.id || isSelf}
                        onClick={() => toggleActive(account)}>
                        {account.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </div>
                  </div>

                  {isSelf && (
                    // Guarded on the server too; this explains the disabled buttons.
                    <p className="mt-2 text-xs text-fg-subtle">
                      You cannot change your own access or deactivate yourself — ask another super
                      admin.
                    </p>
                  )}

                  {open && <EditAccess account={account} modules={modules} onSave={saveAccess} busy={busyId === account.id} />}
                </div>
              );
            })}
          </div>
        </Card>
      </PageBody>
    </>
  );
}

/** One row per module with a three-way access select. */
function AccessGrid({
  modules,
  value,
  onChange,
}: {
  modules: AdminModule[];
  value: Partial<AccessMap>;
  onChange: (key: AdminModuleKey, level: AccessLevel) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => (
        <label
          key={module.key}
          className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
          <span className="text-sm">{module.label}</span>
          <select
            value={value[module.key] ?? 'none'}
            onChange={(e) => onChange(module.key, e.target.value as AccessLevel)}
            className={`${selectClass} py-1 text-xs`}>
            {LEVELS.filter((l) => module.hasActions || l.value !== 'full').map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function EditAccess({
  account,
  modules,
  onSave,
  busy,
}: {
  account: AdminAccount;
  modules: AdminModule[];
  onSave: (account: AdminAccount, isSuper: boolean, access: AccessMap) => void;
  busy: boolean;
}) {
  const [isSuper, setIsSuper] = useState(account.isSuperAdmin);
  const [access, setAccess] = useState<AccessMap>(account.access);

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isSuper}
          onChange={(e) => setIsSuper(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[var(--brand)]"
        />
        <span className="font-medium">Super admin</span>
      </label>
      {!isSuper && (
        <AccessGrid
          modules={modules}
          value={access}
          onChange={(key, level) => setAccess({ ...access, [key]: level })}
        />
      )}
      <div className="mt-4">
        <Button disabled={busy} onClick={() => onSave(account, isSuper, access)}>
          {busy ? 'Saving…' : 'Save access'}
        </Button>
      </div>
    </div>
  );
}

/** "Wallet, Disputes +2 more" — enough to scan without expanding the row. */
function summarise(access: AccessMap, modules: AdminModule[]): string {
  const granted = modules.filter((m) => access[m.key] && access[m.key] !== 'none');
  if (granted.length === 0) return 'No modules granted';
  const names = granted.map((m) => m.label);
  return names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
}
