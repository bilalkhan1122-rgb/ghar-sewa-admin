import { api } from './client';

/**
 * How customers pay for work.
 *
 * PREPAID is the original rule: the wallet must cover the job before it can be
 * posted or booked. POSTPAID lets customers post first and settle once they
 * confirm the work is done — the provider is paid out of that settlement, so
 * an unpaid bill also blocks the customer from posting anything new.
 */
export type PaymentMode = 'PREPAID' | 'POSTPAID';

export type PlatformSettings = {
  id: string;
  paymentMode: PaymentMode;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export const settingsApi = {
  get: () => api.get<PlatformSettings>('/admin/settings'),
  setPaymentMode: (paymentMode: PaymentMode) =>
    api.patch<PlatformSettings>('/admin/settings/payment-mode', { paymentMode }),
};
