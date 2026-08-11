import { api, qs } from './client';
import type { Paginated, ServiceCategory } from './types';

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateCategoryPayload = Partial<CreateCategoryPayload> & { slug?: string };

export const categoriesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) =>
    api.get<Paginated<ServiceCategory>>(`/admin/categories${qs(params ?? {})}`),
  create: (payload: CreateCategoryPayload) =>
    api.post<ServiceCategory>('/admin/categories', payload),
  update: (id: string, payload: UpdateCategoryPayload) =>
    api.patch<ServiceCategory>(`/admin/categories/${id}`, payload),
  /** Flips isActive. Hiding keeps historical jobs intact, unlike deleting. */
  toggleStatus: (id: string) => api.patch<ServiceCategory>(`/admin/categories/${id}/status`),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/categories/${id}`),
  reorder: (categoryIds: string[]) =>
    api.post<{ message: string }>('/admin/categories/reorder', { categoryIds }),
  stats: (id: string) =>
    api.get<{ totalJobs: number; activeProviders: number }>(`/admin/categories/${id}/stats`),
};
