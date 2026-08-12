import { api, qs } from './client';
import { Paginated, ServiceCategory } from './types';

/**
 * Admin job listing (`GET /admin/jobs`). Prisma `Decimal` columns serialize as
 * numeric strings, so `offeredPrice` is a string — run it through `toNumber()`.
 */
export type AdminJob = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  offeredPrice: string | null;
  createdAt: string;
  category: ServiceCategory | null;
  customer: { id: string; fullName: string; phone: string } | null;
};

export type AdminJobQuery = {
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
};

export const jobsApi = {
  list: (params?: AdminJobQuery) => api.get<Paginated<AdminJob>>(`/admin/jobs${qs(params ?? {})}`),
  getById: (id: string) => api.get<AdminJob>(`/admin/jobs/${id}`),
};
