import { request } from './client';

export type AccountType = 'demo' | 'live';

/**
 * Verification status as the API reports it.
 *
 * 'verified' is what the backend returns for the new kyc app; 'approved' is
 * the legacy single-document value. Both are accepted so the badge renders
 * correctly whichever flow the account came through.
 */
export type KycStatus = 'none' | 'pending' | 'verified' | 'approved' | 'rejected';

export interface KycRecord {
  id: number;
  docType: string;
  docNumber: string;
  docImage: string | null;
  status: string;
  reviewNote: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface FeeConfig {
  fundingPercent: number;
  withdrawalPercent: number;
  minWithdrawal: number;
}

export interface AccountStatus {
  accountType: AccountType;
  availableBalance: number;
  liveVerified: boolean;
  kycPending: boolean;
  kycStatus: KycStatus;
  kyc: KycRecord[];
  fees: FeeConfig;
  /**
   * The same values under their canonical names. The API returns both
   * shapes and they are kept in sync server-side, so a client can use
   * whichever it prefers without the two drifting apart.
   */
  account_type: AccountType;
  balance: number;
  currency: string;
  verification_status: KycStatus;
  can_trade_live: boolean;
}

export interface Withdrawal {
  id: number;
  amount: string;
  fee: string;
  netAmount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface FundBreakdown {
  amount: string;
  fee: string;
  total: string;
}

export interface FundResponse {
  authorizationUrl: string;
  reference: string;
  breakdown: FundBreakdown;
}

export interface CreateWithdrawalResponse {
  message: string;
  withdrawal: Withdrawal;
  availableBalance: string;
}

// TODO: confirm against real backend
export function getAccountStatus(
  token: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<AccountStatus> {
  return request<AccountStatus>('/account/', { token, ...options });
}

// TODO: confirm against real backend
export function setAccountType(
  token: string,
  accountType: AccountType
): Promise<AccountStatus> {
  return request<AccountStatus>('/account/type/', {
    method: 'POST',
    token,
    body: { accountType },
  });
}

// Multipart file upload for a KYC document.
// TODO: confirm against real backend
export function submitKyc(
  token: string,
  docType: string,
  docNumber: string,
  file: File
): Promise<{ message: string; kyc: KycRecord }> {
  const form = new FormData();
  form.append('doc_type', docType);
  form.append('doc_number', docNumber);
  form.append('doc_image', file);

  return fetch(`${clientBase()}/account/kyc/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }).then(async (resp) => {
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(
        (data && typeof data.message === 'string' && data.message) ||
          `Request failed with status ${resp.status}`
      );
    }
    return data;
  });
}

function clientBase(): string {
  return (
    (process.env.REACT_APP_API_URL as string | undefined) ||
    'http://localhost:8000/api'
  );
}

// TODO: confirm against real backend
export function fundLiveAccount(token: string, amount: number): Promise<FundResponse> {
  return request<FundResponse>('/account/live/fund/', {
    method: 'POST',
    token,
    body: { amount },
  });
}

// TODO: confirm against real backend
export function getMyWithdrawals(
  token: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<Withdrawal[]> {
  return request<Withdrawal[]>('/account/withdrawals/', { token, ...options });
}

// TODO: confirm against real backend
export function createWithdrawal(
  token: string,
  payload: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }
): Promise<CreateWithdrawalResponse> {
  return request<CreateWithdrawalResponse>('/account/withdraw/', {
    method: 'POST',
    token,
    body: payload,
  });
}
