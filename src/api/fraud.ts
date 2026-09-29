import { request } from './client';

export interface FraudUser {
  id: number | string;
  name: string;
  email: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  updatedAt: string | null;
}

// TODO: confirm against real backend
export function getFraudUsers(token: string): Promise<FraudUser[]> {
  return request<FraudUser[]>('/fraud/users/', { token });
}
