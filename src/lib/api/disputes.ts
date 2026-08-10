import { api, qs } from './client';
import { Paginated } from './types';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'WAITING_FOR_RESPONSE' | 'RESOLVED' | 'REJECTED';
export type DisputeResolution = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'REDO_WORK' | 'NO_REFUND';
export type DisputeEvidenceType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export type Dispute = {
  id: string;
  bookingId: string;
  jobId: string;
  raisedById: string;
  opponentId: string;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  refundAmount: string | null;
  evidenceCount: number;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DisputeListItem = Dispute & {
  booking: { id: string; totalAmount: string; status: string };
  job: { id: string; title: string };
  raisedBy: { id: string; fullName: string; role: string };
  opponent: { id: string; fullName: string; role: string };
};

export type DisputeEvidence = {
  id: string;
  disputeId: string;
  uploaderId: string;
  type: DisputeEvidenceType;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader?: { id: string; fullName: string; role: string };
};

export type DisputeTimelineEntry = {
  id: string;
  disputeId: string;
  actorId: string | null;
  action: string;
  description: string | null;
  createdAt: string;
  actor?: { id: string; fullName: string; role: string } | null;
};

export type DisputeDetail = DisputeListItem & {
  evidences: DisputeEvidence[];
  timeline: DisputeTimelineEntry[];
};

export type RaiseDisputePayload = { bookingId: string; reason: string; description?: string };

export type DisputeQuery = { page?: number; limit?: number; status?: DisputeStatus };

export const disputesApi = {
  admin: {
    list: (query?: DisputeQuery) =>
      api.get<
        Paginated<
          DisputeListItem & {
            job: { id: string; title: string };
            _count: { evidences: number };
          }
        >
      >(`/admin/disputes${qs(query ?? {})}`),
    getById: (id: string) => api.get<DisputeDetail>(`/admin/disputes/${id}`),
    evidence: (id: string) => api.get<DisputeEvidence[]>(`/admin/disputes/${id}/evidence`),
    timeline: (id: string) => api.get<DisputeTimelineEntry[]>(`/admin/disputes/${id}/timeline`),
    updateStatus: (id: string, status: DisputeStatus, note?: string) =>
      api.post<Dispute>(`/admin/disputes/${id}/status`, { status, note }),
    resolve: (id: string, resolution: DisputeResolution, refundAmount?: number, note?: string) =>
      api.post<{ message: string; dispute: Dispute }>(`/admin/disputes/${id}/resolve`, {
        resolution,
        refundAmount,
        note,
      }),
    reject: (id: string, reason: string) =>
      api.post<{ message: string; dispute: Dispute }>(`/admin/disputes/${id}/reject`, { reason }),
  },
};
