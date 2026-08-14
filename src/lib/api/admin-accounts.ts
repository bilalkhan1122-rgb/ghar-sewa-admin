import { api } from './client';

/** Mirrors ADMIN_MODULES on the backend. */
export type AdminModuleKey =
  | 'overview'
  | 'providers'
  | 'users'
  | 'jobs'
  | 'categories'
  | 'verifications'
  | 'disputes'
  | 'wallet'
  | 'reports'
  | 'notifications'
  | 'analytics'
  | 'admins';

export type AccessLevel = 'none' | 'view' | 'full';

export type AccessMap = Record<AdminModuleKey, AccessLevel>;

export type AdminModule = {
  key: AdminModuleKey;
  label: string;
  /** False for view-only modules, where "Full" would mean nothing extra. */
  hasActions: boolean;
};

export type AdminAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  status: string;
  createdAt: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  role: string;
  access: AccessMap;
};

export type AdminMe = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  createdAt: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  role: string;
  permissions: string[];
  access: AccessMap;
};

export type CreateAdminPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  isSuperAdmin: boolean;
  access: Partial<AccessMap>;
};

export const adminAccountsApi = {
  me: () => api.get<AdminMe>('/admin/accounts/me'),
  updateMe: (payload: { fullName?: string; phone?: string }) =>
    api.patch<{ message: string }>('/admin/accounts/me', payload),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/admin/accounts/me/password', {
      currentPassword,
      newPassword,
    }),

  modules: () => api.get<AdminModule[]>('/admin/accounts/modules'),
  list: () => api.get<AdminAccount[]>('/admin/accounts'),
  create: (payload: CreateAdminPayload) =>
    api.post<{ message: string }>('/admin/accounts', payload),
  update: (
    id: string,
    payload: { isSuperAdmin?: boolean; access?: Partial<AccessMap>; isActive?: boolean },
  ) => api.patch<{ message: string }>(`/admin/accounts/${id}`, payload),
};
