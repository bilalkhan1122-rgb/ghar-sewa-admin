import { api, qs } from './client';
import { BackendRole, Paginated, UserStatus, VerificationStatus } from './types';

export type DashboardSummary = {
  period: { dateFrom: string | null; dateTo: string | null };
  users: { totalCustomers: number; totalProviders: number; newUsersToday: number };
  providers: {
    pendingVerifications: number;
    approvedProviders: number;
    rejectedProviders: number;
    bannedProviders: number;
  };
  jobs: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    expired: number;
    disputed: number;
    todayCompletedJobs: number;
  };
  disputes: { openDisputes: number };
  finance: {
    pendingWithdrawals: number;
    pendingTopUps: number;
    platformWalletBalance: string;
    totalPlatformCommission: string;
    totalWalletBalance: string;
    totalHeldBalance: string;
    todayRevenue: string;
  };
};

export type DashboardWidgets = {
  pendingVerifications: number;
  openDisputes: number;
  pendingWithdrawals: number;
  pendingTopUps: number;
  activeJobs: number;
  newUsers: { today: number; last7Days: number };
  revenue: { today: string; thisMonth: string; total: string };
  commission: { today: string; thisMonth: string; total: string };
};

export type AdminProviderListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  isActive: boolean;
  profilePhoto: string | null;
  createdAt: string;
  providerProfile: { hourlyRate: string | null; cnicNumber: string | null } | null;
  wallet: { balance: string; heldBalance: string; status: string } | null;
  ratingSummary: { averageRating: string; totalReviews: number } | null;
};

export type DateRangeQuery = { dateFrom?: string; dateTo?: string };

export const adminApi = {
  dashboard: {
    summary: (range?: DateRangeQuery) =>
      api.get<DashboardSummary>(`/admin/dashboard/summary${qs(range ?? {})}`),
    widgets: () => api.get<DashboardWidgets>('/admin/dashboard/widgets'),
  },

  providers: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: UserStatus;
      verificationStatus?: VerificationStatus;
    }) => api.get<Paginated<AdminProviderListItem>>(`/admin/providers${qs(params ?? {})}`),
    getById: (id: string) => api.get<AdminProviderListItem>(`/admin/providers/${id}`),
    performance: (id: string) => api.get(`/admin/providers/${id}/performance`),
    suspend: (id: string, reason: string) =>
      api.post<{ message: string }>(`/admin/providers/${id}/suspend`, { reason }),
    unsuspend: (id: string) => api.post<{ message: string }>(`/admin/providers/${id}/unsuspend`),
  },

  notifications: {
    sendToUser: (payload: { userId: string; type: string; title: string; message: string }) =>
      api.post<{ message: string; notificationId: string | null }>('/admin/notifications/send', payload),
    sendToRole: (payload: { role: BackendRole; type: string; title: string; message: string }) =>
      api.post<{ message: string; recipients: number }>('/admin/notifications/send/role', payload),
    broadcast: (payload: { type: string; title: string; message: string }) =>
      api.post<{ message: string; recipients: number }>('/admin/notifications/broadcast', payload),
  },

  reports: {
    users: (range?: DateRangeQuery) => api.get(`/admin/reports/users${qs(range ?? {})}`),
    providers: (range?: DateRangeQuery) => api.get(`/admin/reports/providers${qs(range ?? {})}`),
    jobs: (range?: DateRangeQuery) => api.get(`/admin/reports/jobs${qs(range ?? {})}`),
    financial: (range?: DateRangeQuery) => api.get(`/admin/reports/financial${qs(range ?? {})}`),
    disputes: (range?: DateRangeQuery) => api.get(`/admin/reports/disputes${qs(range ?? {})}`),
  },

  search: (q: string, limit = 10) => api.get(`/admin/search${qs({ q, limit })}`),

  auditLogs: (params?: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get<Paginated<unknown>>(`/admin/audit-logs${qs(params ?? {})}`),
};
