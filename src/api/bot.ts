import { request } from './client';

// NOTE: The real Python API contract is not finalized. These shapes are
// assumptions used as placeholders. Keep each function body isolated to a
// single fetch call so swapping in the real endpoints later is a one-line
// change per function, not a rewrite.

export interface BotStatus {
  running: boolean;
  [key: string]: unknown;
}

export interface EquityPoint {
  timestamp: string;
  value: number;
}

export interface Position {
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entry: number;
  current: number;
  profit: number;
  [key: string]: unknown;
}

export interface Trade {
  id: number | string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  price: number;
  profit: number;
  time: string;
  [key: string]: unknown;
}

// TODO: confirm against real backend
export function getBotStatus(token: string): Promise<BotStatus> {
  return request<BotStatus>('/bot/status', { token });
}

// TODO: confirm against real backend
export function startBot(token: string): Promise<MessageResponse> {
  return request<MessageResponse>('/bot/start', { method: 'POST', token });
}

// TODO: confirm against real backend
export function stopBot(token: string): Promise<MessageResponse> {
  return request<MessageResponse>('/bot/stop', { method: 'POST', token });
}

// TODO: confirm against real backend
export function getEquity(token: string): Promise<EquityPoint[]> {
  return request<EquityPoint[]>('/bot/equity', { token });
}

// TODO: confirm against real backend
export function getPositions(token: string): Promise<Position[]> {
  return request<Position[]>('/bot/positions', { token });
}

// TODO: confirm against real backend
export function getTrades(token: string, limit = 20): Promise<Trade[]> {
  return request<Trade[]>(`/bot/trades?limit=${limit}`, { token });
}

interface MessageResponse {
  message: string;
}
