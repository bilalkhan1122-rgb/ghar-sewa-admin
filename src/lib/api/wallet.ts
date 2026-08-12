import { api, qs } from './client';
import { Paginated } from './types';

export type WalletType = 'CUSTOMER' | 'PROVIDER';
export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'SUSPENDED';
export type WalletTransactionType =
  | 'TOP_UP'
  | 'JOB_PAYMENT'
  | 'PROVIDER_EARNING'
  | 'PLATFORM_COMMISSION'
  | 'REFUND'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_COMPLETED'
  | 'WITHDRAWAL_REJECTED'
  | 'ADJUSTMENT';
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type TopUpStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WithdrawalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';
export type PaymentMethod = 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'CASH' | 'OTHER';

export type Wallet = {
  id: string;
  userId: string;
  type: WalletType;
  balance: string;
  heldBalance: string;
  lifetimeCredits: string;
  lifetimeDebits: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  status: WalletTransactionStatus;
  createdAt: string;
};

export type WalletSummary = {
  walletId: string;
  walletStatus: WalletStatus;
  balance: string;
  heldBalance: string;
  lifetimeCredits: string;
  lifetimeDebits: string;
  totalTopUps: string;
  totalWithdrawals: string;
  pendingWithdrawals: string;
};

export type EarningsSummary = {
  availableBalance: string;
  heldBalance: string;
  lifetimeEarnings: string;
  lifetimeWithdrawals: string;
  pendingWithdrawals: string;
  platformCommissionPaid: string;
  monthlyEarnings: string;
  totalCompletedJobs: number;
};

export type TopUpRequest = {
  id: string;
  userId: string;
  walletId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  proofImage: string | null;
  notes: string | null;
  status: TopUpStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WithdrawalRequest = {
  id: string;
  providerId: string;
  walletId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  status: WithdrawalStatus;
  submittedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateWithdrawalPayload = {
  amount: number;
  paymentMethod: PaymentMethod;
  accountName: string;
  accountNumber: string;
  bankName?: string;
};

export type TxQuery = {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
};

export const walletApi = {
  admin: {
    wallets: (page = 1, limit = 10, type?: WalletType, status?: WalletStatus) =>
      api.get<Paginated<Wallet & { user: { id: string; fullName: string; email: string; phone: string } }>>(
        `/admin/wallet/wallets${qs({ page, limit, type, status })}`,
      ),
    transactions: (query?: TxQuery) =>
      api.get<Paginated<WalletTransaction>>(`/admin/wallet/transactions${qs(query ?? {})}`),

    topUps: (page = 1, limit = 10, status?: TopUpStatus) =>
      api.get<Paginated<TopUpRequest & { user: { id: string; fullName: string; email: string; phone: string } }>>(
        `/admin/wallet/topups${qs({ page, limit, status })}`,
      ),
    approveTopUp: (id: string, note?: string) =>
      api.post<TopUpRequest>(`/admin/wallet/topups/${id}/approve`, { note }),
    rejectTopUp: (id: string, reason: string) =>
      api.post<TopUpRequest>(`/admin/wallet/topups/${id}/reject`, { reason }),

    withdrawals: (page = 1, limit = 10, status?: WithdrawalStatus, search?: string) =>
      api.get<
        Paginated<WithdrawalRequest & { provider: { id: string; fullName: string; email: string; phone: string } }>
      >(`/admin/wallet/withdrawals${qs({ page, limit, status, search })}`),
    approveWithdrawal: (id: string, note?: string) =>
      api.post<WithdrawalRequest>(`/admin/wallet/withdrawals/${id}/approve`, { note }),
    processWithdrawal: (id: string, note?: string) =>
      api.post<WithdrawalRequest>(`/admin/wallet/withdrawals/${id}/process`, { note }),
    completeWithdrawal: (id: string, note?: string) =>
      api.post<WithdrawalRequest>(`/admin/wallet/withdrawals/${id}/complete`, { note }),
    rejectWithdrawal: (id: string, reason: string) =>
      api.post<WithdrawalRequest>(`/admin/wallet/withdrawals/${id}/reject`, { reason }),
  },
};
