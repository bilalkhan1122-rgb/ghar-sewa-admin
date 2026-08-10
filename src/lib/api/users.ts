import { api } from './client';
import { BackendRole, PaginatedUsers, User } from './types';

export type UpdateProfilePayload = { fullName?: string; cityId?: string; address?: string };
export type UpdateUserPayload = { fullName?: string } & { role?: BackendRole; isActive?: boolean };

export type WalletSummary = {
  currentBalance: string;
  totalSpent: string;
  totalTopups: string;
  pendingTransactions: { id: string; totalAmount: string; status: string; createdAt: string }[];
};

export type BookingSummary = {
  totalBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  disputedBookings: number;
};

export const usersApi = {
  getProfile: () => api.get<User>('/users/profile'),
  updateProfile: (payload: UpdateProfilePayload) => api.patch<User>('/users/profile', payload),
  walletSummary: () => api.get<WalletSummary>('/users/wallet'),
  bookingSummary: () => api.get<BookingSummary>('/users/bookings/summary'),
  deleteAccount: () => api.delete<{ message: string }>('/users/account'),

  // admin only
  list: (page = 1, limit = 10) => api.get<PaginatedUsers>(`/users?page=${page}&limit=${limit}`),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  updateById: (id: string, payload: UpdateUserPayload) => api.patch<User>(`/users/${id}`, payload),
  deleteById: (id: string) => api.delete<{ message: string }>(`/users/${id}`),
};
