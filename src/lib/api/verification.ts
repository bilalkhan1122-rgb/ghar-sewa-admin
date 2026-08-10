import { api, qs } from './client';
import { City, Paginated, VerificationStatus } from './types';

export type VerificationRequest = {
  id: string;
  providerId: string;
  cnicNumber: string;
  facePhoto: string;
  cnicFrontImage: string;
  cnicBackImage: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerificationRequestWithProvider = VerificationRequest & {
  provider: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    profilePhoto: string | null;
    city: City;
    providerProfile: {
      bio: string | null;
      hourlyRate: string | null;
      serviceLocation: string | null;
      serviceRadius: number | null;
    } | null;
  };
};

export type VerificationStatusSummary = {
  verificationStatus: VerificationStatus;
  profileCompleted: boolean;
  latestRequest: {
    id: string;
    status: VerificationStatus;
    submittedAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
  } | null;
};

export const verificationApi = {
  // provider
  submit: () =>
    api.post<{ message: string; verificationStatus: 'PENDING'; requestId: string }>(
      '/verification/submit',
    ),
  status: () => api.get<VerificationStatusSummary>('/verification/status'),
  history: (page = 1, limit = 10, status?: VerificationStatus) =>
    api.get<Paginated<VerificationRequest>>(`/verification/history${qs({ page, limit, status })}`),

  // admin
  adminList: (page = 1, limit = 10, status?: VerificationStatus) =>
    api.get<Paginated<VerificationRequestWithProvider>>(
      `/admin/verification/requests${qs({ page, limit, status })}`,
    ),
  adminGetById: (id: string) =>
    api.get<VerificationRequestWithProvider>(`/admin/verification/requests/${id}`),
  approve: (id: string) =>
    api.post<{ message: string; request: VerificationRequest }>(
      `/admin/verification/requests/${id}/approve`,
    ),
  reject: (id: string, reason: string) =>
    api.post<{ message: string; request: VerificationRequest }>(
      `/admin/verification/requests/${id}/reject`,
      { reason },
    ),
  ban: (providerId: string) =>
    api.post<{ message: string; verificationStatus: 'BANNED' }>(
      `/admin/verification/providers/${providerId}/ban`,
    ),
  unban: (providerId: string) =>
    api.post<{ message: string; verificationStatus: 'INCOMPLETE' }>(
      `/admin/verification/providers/${providerId}/unban`,
    ),
};
