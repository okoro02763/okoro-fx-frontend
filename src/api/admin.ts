import { request } from './client';

export interface FraudInfo {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

export interface AdminUser {
  id: number | string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  tradeCount: number;
  fraud: FraudInfo;
}

export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// TODO: confirm against real backend
export function getUsers(token: string): Promise<AdminUser[]> {
  return request<AdminUser[]>('/admin/users/', { token });
}

// TODO: confirm against real backend
export function changeUserStatus(
  token: string,
  userId: number | string,
  status: AdminUser['status']
): Promise<{ id: number; status: string }> {
  return request(`/admin/users/${userId}/status/`, {
    method: 'POST',
    body: { status },
    token,
  });
}

// TODO: confirm against real backend
export function changeUserRole(
  token: string,
  userId: number | string,
  role: AdminUser['role']
): Promise<{ id: number; role: string }> {
  return request(`/admin/users/${userId}/role/`, {
    method: 'POST',
    body: { role },
    token,
  });
}

// TODO: confirm against real backend
export function recomputeFraud(
  token: string,
  userId: number | string
): Promise<{ id: number; score: number; level: string; reasons: string[] }> {
  return request(`/admin/users/${userId}/fraud/`, {
    method: 'POST',
    body: {},
    token,
  });
}

// TODO: confirm against real backend
export function getAuditLogs(token: string): Promise<AuditLog[]> {
  return request<AuditLog[]>('/admin/audit-logs/', { token });
}

export interface AdminWithdrawal {
  id: number;
  userId: number;
  name: string;
  email: string;
  amount: string;
  fee: string;
  netAmount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

// TODO: confirm against real backend
export function getWithdrawals(token: string): Promise<AdminWithdrawal[]> {
  return request<AdminWithdrawal[]>('/admin/withdrawals/', { token });
}

export type WithdrawalReviewStatus = 'approved' | 'rejected' | 'paid';

// TODO: confirm against real backend
export function reviewWithdrawal(
  token: string,
  withdrawalId: number,
  status: WithdrawalReviewStatus,
  note?: string
): Promise<AdminWithdrawal> {
  return request(`/admin/withdrawals/${withdrawalId}/review/`, {
    method: 'POST',
    body: { status, note: note || '' },
    token,
  });
}

export interface AdminKyc {
  id: number;
  userId: number;
  name: string;
  email: string;
  docType: string;
  docNumber: string;
  docImage: string | null;
  status: string;
  reviewNote: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export type KycReviewStatus = 'approved' | 'rejected';

// TODO: confirm against real backend
export function getKyc(token: string): Promise<AdminKyc[]> {
  return request<AdminKyc[]>('/admin/kyc/', { token });
}

// TODO: confirm against real backend
export function reviewKyc(
  token: string,
  verificationId: number,
  status: KycReviewStatus,
  note?: string
): Promise<AdminKyc> {
  return request(`/admin/kyc/${verificationId}/review/`, {
    method: 'POST',
    body: { status, note: note || '' },
    token,
  });
}
