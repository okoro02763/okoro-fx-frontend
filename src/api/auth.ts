import { request } from './client';

// NOTE: The real Python API contract is not finalized. These shapes are
// assumptions used as placeholders. Keep each function body isolated to a
// single fetch call so swapping in the real endpoint later is a one-line
// change, not a rewrite.

export interface User {
  id?: number | string;
  name?: string;
  email: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'banned';
  referralCode?: string;
  rewardBalance?: number;
  mustChangePassword?: boolean;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SignupResponse {
  token?: string;
  user?: User;
  message?: string; // present when email verification is required
}

export interface MessageResponse {
  message: string;
}

import { getDeviceId } from '../lib/device';

// TODO: confirm against real backend
export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    headers: { 'X-Device-Id': getDeviceId() },
  } as any);
}

export function verifyDevice(email: string, code: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/verify-device', {
    method: 'POST',
    body: { email, code, device_id: getDeviceId() },
    headers: { 'X-Device-Id': getDeviceId() },
  } as any);
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: { email, device_id: getDeviceId() },
    headers: { 'X-Device-Id': getDeviceId() },
  } as any);
}

export function getDevices(): Promise<{ devices: any[] }> {
  return request<{ devices: any[] }>('/auth/devices');
}

export function revokeDevice(deviceId: number): Promise<MessageResponse> {
  return request<MessageResponse>(`/auth/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

// TODO: confirm against real backend
export function signup(
  name: string,
  email: string,
  password: string,
  referralCode?: string
): Promise<SignupResponse> {
  return request<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: { name, email, password, referralCode },
  });
}

export interface ReferralValidation {
  valid: boolean;
  referrer?: string;
}

// TODO: confirm against real backend
export function validateReferral(code: string): Promise<ReferralValidation> {
  return request<ReferralValidation>(
    `/auth/validate-referral?code=${encodeURIComponent(code)}`
  );
}

// TODO: confirm against real backend
export function forgotPassword(email: string): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

// TODO: confirm against real backend
export function resetPassword(
  token: string,
  password: string
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
}

export interface MeResponse {
  user: User;
}

// TODO: confirm against real backend
export function getMe(token: string): Promise<MeResponse> {
  return request<MeResponse>('/auth/me', { token });
}

export interface InviteResponse {
  message: string;
  inviteUrl: string;
}

// TODO: confirm against real backend
export function inviteUser(token: string, email: string): Promise<InviteResponse> {
  return request<InviteResponse>('/auth/invite', {
    method: 'POST',
    token,
    body: { email },
  });
}

// TODO: confirm against real backend
export function acceptInvite(
  invite: string,
  name: string,
  email: string,
  password: string
): Promise<SignupResponse> {
  return request<SignupResponse>('/auth/accept-invite', {
    method: 'POST',
    body: { invite, name, email, password },
  });
}

// TODO: confirm against real backend
export function changePassword(
  token: string,
  password: string
): Promise<MessageResponse> {
  return request<MessageResponse>('/auth/change-password', {
    method: 'POST',
    token,
    body: { password },
  });
}
