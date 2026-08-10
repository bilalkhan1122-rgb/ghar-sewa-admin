import { api } from './client';
import type { AuthResult, User } from './types';

export type LoginPayload = { email?: string; phone?: string; password: string };

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResult>('/auth/login', payload),
  refresh: () => api.post<{ message: string }>('/auth/refresh'),
  logout: () => api.post<{ message: string }>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};
