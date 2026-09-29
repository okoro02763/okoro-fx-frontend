import { request } from './client';

// NOTE: The real Python API contract is not finalized. These shapes are
// assumptions used as placeholders. Keep each function body isolated to a
// single fetch call so swapping in the real endpoint later is a one-line
// change per function, not a rewrite.

export interface RiskSettings {
  riskPerTrade: number; // percent
  maxLots: number;
  [key: string]: unknown;
}

export interface StrategySettings {
  strategy: string;
  pairs: string[];
  risk: RiskSettings;
  [key: string]: unknown;
}

// TODO: confirm against real backend
export function getStrategy(token: string): Promise<StrategySettings> {
  return request<StrategySettings>('/strategy', { token });
}

// TODO: confirm against real backend
export function saveStrategy(
  token: string,
  settings: StrategySettings
): Promise<StrategySettings> {
  return request<StrategySettings>('/strategy', {
    method: 'PUT',
    body: settings,
    token,
  });
}
