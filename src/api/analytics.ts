import { request } from './client';

export interface PairStat {
  pair: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
}

export interface EquityPoint {
  timestamp: string;
  value: number;
}

export interface AnalyticsSummary {
  totalTrades: number;
  closedTrades: number;
  openPositions: number;
  totalPnl: number;
  winRate: number;
  profitByPair: PairStat[];
  dailyPnl: DailyPnl[];
  equity: EquityPoint[];
}

export interface AnalyticsTrade {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  status: string;
  lots: number;
  entry: number;
  exit: number | null;
  profit: number | null;
  openedAt: string;
  closedAt: string | null;
}

// TODO: confirm against real backend
export function getAnalyticsSummary(token: string): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>('/analytics/summary/', { token });
}

// TODO: confirm against real backend
export function getAnalyticsTrades(
  token: string,
  limit = 50
): Promise<AnalyticsTrade[]> {
  return request<AnalyticsTrade[]>(`/analytics/trades/?limit=${limit}`, {
    token,
  });
}
