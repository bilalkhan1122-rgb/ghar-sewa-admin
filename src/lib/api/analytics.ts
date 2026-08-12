import { api, qs } from './client';

/**
 * Module 21 analytics (`/admin/analytics/*`).
 *
 * Overlaps the older `/admin/reports/*` endpoints on totals, but adds what
 * reports never had: booking lifecycle timings, per-category performance,
 * repeat-customer counts and a CSV export. Money fields come back as numbers
 * here (the service converts Decimals), except where noted as strings.
 */

export type AnalyticsRange =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS'
  | 'LAST_12_MONTHS'
  | 'ALL_TIME'
  | 'CUSTOM';

export type AnalyticsQuery = {
  range?: AnalyticsRange;
  dateFrom?: string;
  dateTo?: string;
  topN?: number;
};

type Period = { dateFrom: string | null; dateTo: string | null };

export type AnalyticsOverview = {
  period: Period;
  jobs: {
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    cancelledJobs: number;
    expiredJobs: number;
    disputedJobs: number;
  };
  revenue: {
    totalCommission: number;
    totalCompletedJobValue: number;
    totalProviderEarnings: number;
    totalWithdrawals: number;
  };
  providers: {
    totalProviders: number;
    approvedProviders: number;
    pendingProviders: number;
    rejectedProviders: number;
    bannedProviders: number;
    averageRating: string;
  };
  customers: { totalCustomers: number; newCustomers: number };
  bookings: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    activeBookings: number;
  };
  disputes: { totalDisputes: number; openDisputes: number; resolvedDisputes: number };
};

export type JobsAnalytics = {
  period: Period;
  totals: Record<string, number>;
  urgentJobs: number;
  timeSeries: {
    postedPerDay: Record<string, number>;
    postedPerWeek: Record<string, number>;
    postedPerMonth: Record<string, number>;
    completedPerDay: Record<string, number>;
  };
};

export type RevenueAnalytics = {
  period: Period;
  totals: {
    totalCommission: number;
    totalCompletedJobValue: number;
    totalProviderEarnings: number;
    totalWithdrawals: number;
    totalTopUps: number;
  };
  commissionTimeSeries: {
    perDay: Record<string, number>;
    perWeek: Record<string, number>;
    perMonth: Record<string, number>;
  };
};

export type CustomerAnalytics = {
  period: Period;
  totals: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    repeatCustomers: number;
  };
};

export type CategoryAnalyticsRow = {
  categoryId: string;
  categoryName: string;
  slug: string;
  icon: string | null;
  totalJobs: number;
  completedJobs: number;
  /** Decimal string. */
  averageJobValue: string;
  /** 0–1. */
  completionRate: number;
};

export type CategoryAnalytics = {
  period: Period;
  mostPopular: CategoryAnalyticsRow[];
  data: CategoryAnalyticsRow[];
};

export type BookingAnalytics = {
  period: Period;
  totals: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    activeBookings: number;
  };
  avgHoursJobToAcceptance: number | null;
  avgHoursAcceptanceToCompletion: number | null;
  byStatus: Record<string, number>;
};

export type CsvExport = { filename: string; mimeType: string; content: string };

export const analyticsApi = {
  overview: (query?: AnalyticsQuery) =>
    api.get<AnalyticsOverview>(`/admin/analytics/overview${qs(query ?? {})}`),
  jobs: (query?: AnalyticsQuery) =>
    api.get<JobsAnalytics>(`/admin/analytics/jobs${qs(query ?? {})}`),
  revenue: (query?: AnalyticsQuery) =>
    api.get<RevenueAnalytics>(`/admin/analytics/revenue${qs(query ?? {})}`),
  customers: (query?: AnalyticsQuery) =>
    api.get<CustomerAnalytics>(`/admin/analytics/customers${qs(query ?? {})}`),
  categories: (query?: AnalyticsQuery) =>
    api.get<CategoryAnalytics>(`/admin/analytics/categories${qs(query ?? {})}`),
  bookings: (query?: AnalyticsQuery) =>
    api.get<BookingAnalytics>(`/admin/analytics/bookings${qs(query ?? {})}`),
  exportCsv: (query?: AnalyticsQuery) =>
    api.get<CsvExport>(`/admin/analytics/export/csv${qs(query ?? {})}`),
};
