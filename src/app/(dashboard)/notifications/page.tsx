'use client';

import { useState } from 'react';
import { adminApi, apiErrorMessage } from '@/lib/api';
import { BellIcon } from '@/components/icons';
import {
  Button,
  CardHeading,
  PageBody,
  PageHeader,
  inputClass,
} from '@/components/ui';
import { useToast } from '@/components/toast';

/**
 * Push notifications, per the Figma "push-notifications" frame: a compose card
 * beside recent broadcast history.
 *
 * The API has no "list sent broadcasts" endpoint, so history shows only the
 * sends made from this session rather than inventing past traffic.
 */
type Audience = 'all' | 'providers' | 'customers';

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'providers', label: 'Providers' },
  { value: 'customers', label: 'Customers' },
];

const MAX_MESSAGE = 280;

type SentItem = { id: string; title: string; audience: string; recipients: number; at: string };

export default function NotificationsPage() {
  const toast = useToast();
  const [audience, setAudience] = useState<Audience>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<SentItem[]>([]);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Give the notification a title and a message.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        type: 'SYSTEM_ANNOUNCEMENT',
        title: title.trim(),
        message: message.trim(),
      };
      const res =
        audience === 'all'
          ? await adminApi.notifications.broadcast(payload)
          : await adminApi.notifications.sendToRole({
              ...payload,
              role: audience === 'providers' ? 'PROVIDER' : 'CUSTOMER',
            });

      setSent((prev) => [
        {
          id: crypto.randomUUID(),
          title: payload.title,
          audience: AUDIENCES.find((a) => a.value === audience)!.label,
          recipients: res.recipients,
          at: new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        ...prev,
      ]);
      setTitle('');
      setMessage('');
      toast.success(
        `Notification sent to ${res.recipients} recipient${res.recipients === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The notification could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Push Notifications"
        subtitle="Dispatch real-time platform system announcements, deals, and safety updates to device screens"
      />

      <PageBody>
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <CardHeading
              title="Send System Announcement"
              subtitle="Draft a notification push card"
            />

            <div className="mt-4 flex rounded-xl bg-surface-muted p-1">
              {AUDIENCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={`flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition ${
                    audience === a.value
                      ? 'bg-surface text-fg shadow-card'
                      : 'text-fg-muted hover:text-fg'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-fg">Notification Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Celebrate Pakistan Independence Day with Rs. 500 Off!"
                className={`mt-1.5 w-full ${inputClass}`}
              />
            </label>

            <label className="mt-4 block">
              <span className="flex items-center justify-between">
                <span className="text-sm font-medium text-fg">Message Content</span>
                <span
                  className={`text-xs tabular-nums ${
                    message.length > MAX_MESSAGE ? 'text-bad-fg' : 'text-fg-subtle'
                  }`}>
                  {message.length} / {MAX_MESSAGE} characters
                </span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Book any service today and apply code PAK67 at checkout for a flat discount."
                className={`mt-1.5 w-full resize-y ${inputClass}`}
              />
            </label>


            <Button
              variant="dark"
              disabled={busy || message.length > MAX_MESSAGE}
              onClick={send}
              className="mt-4 w-full py-2.5">
              {busy ? 'Sending…' : 'Send Notification'}
            </Button>
            <p className="mt-2 text-xs text-fg-subtle">
              This sends immediately to every matching device. There is no undo.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <CardHeading
              title="Recent Broadcast History"
              subtitle="Notifications sent from this session"
            />

            {sent.length === 0 ? (
              <p className="mt-6 rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-fg-muted">
                Nothing sent yet in this session.
                <span className="mt-1 block text-xs text-fg-subtle">
                  The API has no endpoint for listing past broadcasts, so earlier sends cannot be
                  shown here.
                </span>
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {sent.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                      <BellIcon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">{s.title}</span>
                      <span className="block text-xs text-fg-muted">
                        Target: {s.audience} • {s.recipients.toLocaleString('en-PK')} sent
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-subtle">{s.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
