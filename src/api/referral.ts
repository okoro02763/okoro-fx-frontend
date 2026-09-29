import { request } from './client';

export interface ReferredUser {
  name: string;
  email: string;
  reward: number;
  createdAt: string;
}

export interface ReferralsInfo {
  code: string;
  referralLink: string;
  rewardBalance: number;
  referrerReward: number;
  refereeReward: number;
  referralCount: number;
  referred: ReferredUser[];
}

// TODO: confirm against real backend
export function getReferrals(token: string): Promise<ReferralsInfo> {
  return request<ReferralsInfo>('/referrals/', { token });
}
