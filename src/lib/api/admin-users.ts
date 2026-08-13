import { api, qs } from './client';
import type { AdminUserQuery } from './reports';
import { City, Paginated, ServiceCategory, User } from './types';

/**
 * Admin user management (`/admin/users/*`).
 *
 * Distinct from `usersApi.list`, which hits the plain `/users` endpoint and
 * supports no filtering. Everything here is admin-only and every mutating call
 * writes an audit-log entry on the backend.
 */
export type AdminUserListItem = User & {
  city: { id: string; name: string } | null;
  wallet: { id: string; balance: string; heldBalance: string; status: string } | null;
  ratingSummary: { averageRating: string; totalReviews: number } | null;
};

export type AdminUserDetail = User & {
  city: City | null;
  wallet: {
    id: string;
    balance: string;
    heldBalance: string;
    status: string;
    createdAt: string;
  } | null;
  providerProfile: {
    id: string;
    bio: string | null;
    hourlyRate: string | null;
    serviceLocation: string | null;
    serviceRadius: number | null;
    cnicNumber: string | null;
    experienceYears: number | null;
    categories: { category: ServiceCategory }[];
    galleryImages: { id: string; imageUrl: string }[];
  } | null;
  ratingSummary: { averageRating: string; totalReviews: number } | null;
  stats: {
    jobsPosted: number;
    bookings: number;
    disputes: number;
    penalties: number;
    reviewsReceived: number;
  };
};

export const adminUsersApi = {
  list: (params?: AdminUserQuery) =>
    api.get<Paginated<AdminUserListItem>>(`/admin/users${qs(params ?? {})}`),
  getById: (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),

  suspend: (id: string, reason: string) =>
    api.post<{ message: string; user: User }>(`/admin/users/${id}/suspend`, { reason }),
  unsuspend: (id: string) => api.post<{ message: string; user: User }>(`/admin/users/${id}/unsuspend`),
  softDelete: (id: string, reason: string) =>
    api.post<{ message: string }>(`/admin/users/${id}/delete`, { reason }),
  restore: (id: string) => api.post<{ message: string }>(`/admin/users/${id}/restore`),

  removeProfilePhoto: (id: string, reason: string) =>
    api.post<{ message: string; user: User }>(`/admin/users/${id}/profile-photo/remove`, {
      reason,
    }),
  removeGalleryImage: (id: string, imageId: string, reason: string) =>
    api.post<{ message: string; imageId: string }>(
      `/admin/users/${id}/gallery/${imageId}/remove`,
      { reason },
    ),
};
