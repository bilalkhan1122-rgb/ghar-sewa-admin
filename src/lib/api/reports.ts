import { api, qs } from './client';
import { BackendRole, UserStatus, VerificationStatus } from './types';

/**
 * Admin reporting endpoints (`/admin/reports/*`).
 *
 * Shapes mirror the backend's `AdminService.report*` return values. Prisma
 * `Decimal` columns serialize as numeric strings, so money fields are typed
 * `string` and must go through `toNumber()` before arithmetic.
 */
export type DateRange = { dateFrom?: string; dateTo?: string };

export type UsersReport = {
  totalUsers: number;
  byRole: Partial<Record<BackendRole, number>>;
  activeUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  /** ISO date (YYYY-MM-DD) → registrations that day. */
  dailyRegistrations: Record<string, number>;
  /** YYYY-MM → registrations that month. */
  monthlyRegistrations: Record<string, number>;
};

export type ProvidersReport = {
  totalProviders: number;
  verificationStatistics: Partial<Record<VerificationStatus, number>>;
  averageRating: string;
  ratedProviders: number;
  topProviders: {
    providerId: string;
    fullName: string;
    email: string;
    phone: string;
    averageRating: string;
    totalReviews: number;
  }[];
};

export type JobsReport = {
  totalJobs: number;
  byStatus: Record<string, number>;
  completedJobs: number;
  cancelledJobs: number;
  expiredJobs: number;
  jobsByCategory: { categoryId: string; count: number }[];
};

export type FinancialReport = {
  period: { dateFrom: string | null; dateTo: string | null };
  revenue: string;
  commissionEarned: string;
  totalWalletBalance: string;
  totalHeldBalance: string;
  pendingWithdrawals: string;
  pendingTopUps: string;
  topUpsApproved: string;
  withdrawalsCompleted: string;
};

export type DisputesReport = {
  totalDisputes: number;
  resolved: number;
  rejected: number;
  pending: number;
  byStatus: Record<string, number>;
  byResolution: Record<string, number>;
};

export const reportsApi = {
  users: (range?: DateRange) => api.get<UsersReport>(`/admin/reports/users${qs(range ?? {})}`),
  providers: (range?: DateRange) =>
    api.get<ProvidersReport>(`/admin/reports/providers${qs(range ?? {})}`),
  jobs: (range?: DateRange) => api.get<JobsReport>(`/admin/reports/jobs${qs(range ?? {})}`),
  financial: (range?: DateRange) =>
    api.get<FinancialReport>(`/admin/reports/financial${qs(range ?? {})}`),
  disputes: (range?: DateRange) =>
    api.get<DisputesReport>(`/admin/reports/disputes${qs(range ?? {})}`),
};

/** Filters accepted by `GET /admin/users`. */
export type AdminUserQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: BackendRole;
  status?: UserStatus;
  verificationStatus?: VerificationStatus;
  /** `'true'` returns *only* soft-deleted users. */
  deleted?: string;
} & DateRange;
