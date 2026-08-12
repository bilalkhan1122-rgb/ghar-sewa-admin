import { api } from './client';
import type { AuthResult, User } from './types';

export type LoginPayload = { email?: string; phone?: string; password: string };

export const authApi = {
  login: (payload: LoginPayload) => api.post<AuthResult>('/auth/login', payload),
  /**
   * Password reset for every Ghar Sewa account, not just admins: the reset
   * email has to land somewhere on the web, and this is the only web app in
   * the product. FRONTEND_URL on the API points at this origin.
   */
  resetPassword: (payload: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', payload),
  refresh: () => api.post<{ message: string }>('/auth/refresh'),
  logout: () => api.post<{ message: string }>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};
