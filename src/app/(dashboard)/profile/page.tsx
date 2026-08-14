'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  adminAccountsApi,
  apiErrorMessage,
  fileUrl,
  type AdminMe,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/toast';
import {
  Button,
  Card,
  ErrorNote,
  Field,
  inputClass,
  PageBody,
  PageHeader,
  SectionLabel,
} from '@/components/ui';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

export default function ProfilePage() {
  const toast = useToast();
  const { refreshAccess } = useAuth();

  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(() => {
    adminAccountsApi
      .me()
      .then((data) => {
        setMe(data);
        setFullName(data.fullName);
        setPhone(data.phone);
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your profile.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const saveProfile = async () => {
    if (fullName.trim().length < 2) {
      toast.error('Enter your full name.');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await adminAccountsApi.updateMe({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      toast.success(res.message);
      load();
      // The header shows the name and initial, which come from the session.
      void refreshAccess();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Enter your current password and a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await adminAccountsApi.changePassword(currentPassword, newPassword);
      toast.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change your password.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const passwordField = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    autoComplete: string,
  ) => (
    <Field label={label}>
      <div className="relative">
        <input
          type={showPasswords ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pr-10 ${inputClass}`}
        />
        <button
          type="button"
          onClick={() => setShowPasswords((v) => !v)}
          aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
          aria-pressed={showPasswords}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-fg-subtle outline-none hover:text-fg focus-visible:text-fg">
          {showPasswords ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </Field>
  );

  if (loading) return <p className="p-6 text-sm text-fg-subtle">Loading…</p>;
  if (!me) return <ErrorNote message={error ?? 'Could not load your profile.'} />;

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your admin account details and password" />

      <PageBody>
        <ErrorNote message={error} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <SectionLabel>Account</SectionLabel>
            <div className="mt-3 flex items-center gap-4">
              {me.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(me.profilePhoto)}
                  alt=""
                  className="h-16 w-16 rounded-full border border-line object-cover"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-surface-muted text-lg font-semibold text-fg-muted">
                  {me.fullName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{me.email}</p>
                <p className="text-xs text-fg-subtle">
                  {me.isSuperAdmin ? 'Super admin — full access' : `Role: ${me.role}`}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full ${inputClass}`}
                />
              </Field>
            </div>
            {/* Email is the sign-in identifier and is deliberately not editable
                here — changing it needs a re-verification flow that does not
                exist yet. */}
            <p className="mt-2 text-xs text-fg-subtle">
              Your email is used to sign in and cannot be changed here.
            </p>

            <div className="mt-4">
              <Button disabled={savingProfile} onClick={saveProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Card>

          <Card>
            <SectionLabel>Change password</SectionLabel>
            <p className="mt-1 text-sm text-fg-muted">
              Changing your password signs you out of every other device.
            </p>
            <div className="mt-3 space-y-3">
              {passwordField('Current password', currentPassword, setCurrentPassword, 'current-password')}
              {passwordField('New password', newPassword, setNewPassword, 'new-password')}
              {passwordField('Confirm new password', confirmPassword, setConfirmPassword, 'new-password')}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">
              At least 8 characters, including a letter and a number.
            </p>
            <div className="mt-4">
              <Button disabled={savingPassword} onClick={savePassword}>
                {savingPassword ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
