'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Action feedback for the whole dashboard.
 *
 * Page-level problems — a list that would not load — stay inline via
 * `ErrorNote`, because they describe the state of what you are looking at.
 * Toasts are for the outcome of something you just did, which has no natural
 * place on the page once the list refreshes underneath it.
 */
type Tone = 'success' | 'error';

type Toast = { id: number; tone: Tone; message: string };

/** Errors linger: they are usually longer, and often worth re-reading. */
const DURATION: Record<Tone, number> = { success: 4000, error: 8000 };

/** Older toasts drop off the top rather than filling the screen. */
const MAX_VISIBLE = 4;

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  // Cleared on unmount so a dismissal cannot fire against a gone component.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      if (!message) return;
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[tone]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  // Memoised so pages can safely list it in an effect's dependencies.
  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // `pointer-events-none` on the stack, re-enabled per toast: the region
        // spans a corner of the viewport and would otherwise swallow clicks on
        // whatever sits beneath it.
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        aria-live="polite"
        aria-atomic="false">
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const success = toast.tone === 'success';
  return (
    <div
      // Errors interrupt; successes wait their turn in the polite queue above.
      role={success ? 'status' : 'alert'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-card ring-1 motion-safe:animate-[toast-in_150ms_ease-out] ${
        success
          ? 'bg-ok-soft text-ok-fg ring-ok-line'
          : 'bg-bad-soft text-bad-fg ring-bad-line'
      }`}>
      <span aria-hidden="true" className="mt-px shrink-0 text-sm leading-5">
        {success ? '✓' : '!'}
      </span>
      {/* `whitespace-pre-line`: validation failures arrive as newline-joined
          per-field reasons from apiErrorMessage. */}
      <p className="min-w-0 flex-1 whitespace-pre-line text-sm leading-5">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mr-1 shrink-0 cursor-pointer rounded px-1 text-sm leading-5 opacity-60 transition hover:opacity-100">
        ×
      </button>
    </div>
  );
}
