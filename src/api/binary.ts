import axios from 'axios';
import { getToken } from '../api/token';
import type { Candle, Instrument, Quote, Trade, Wallet } from '../types/binary';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** WebSocket URL for a symbol's live price stream.
 *
 * The backend mounts it at ``/ws/prices/<symbol>/`` and symbols contain a
 * slash (``EUR/USD``), which is why the path is built raw rather than encoded.
 */
export function priceSocketUrl(symbol: string): string {
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const ws = origin.replace(/^http/, 'ws');
  return `${ws}/ws/prices/${symbol}/`;
}

export interface InstrumentsResponse {
  count: number;
  results: Instrument[];
}

export interface TradesResponse {
  count: number;
  results: Trade[];
  wallet: Wallet;
}

export const binaryApi = {
  getInstruments: async (
    category?: string,
    includeQuote = false
  ): Promise<Instrument[]> => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (includeQuote) params.include_quote = '1';
    const res = await api.get<InstrumentsResponse>('/market/instruments/', { params });
    return res.data.results;
  },

  getQuote: async (symbol: string): Promise<Quote> => {
    const res = await api.get<Quote>('/market/quote/', { params: { symbol } });
    return res.data;
  },

  getCandles: async (
    symbol: string,
    interval: string,
    outputsize = 300
  ): Promise<Candle[]> => {
    const res = await api.get<{ results: Candle[] }>('/market/candles/', {
      params: { symbol, interval, outputsize },
    });
    return res.data.results;
  },

  getWallet: async (): Promise<Wallet> => {
    const res = await api.get<Wallet>('/trading/wallet/');
    return res.data;
  },

  resetWallet: async (): Promise<Wallet> => {
    const res = await api.post<{ wallet: Wallet }>('/trading/wallet/reset/');
    return res.data.wallet;
  },

  getTrades: async (status?: string): Promise<TradesResponse> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await api.get<TradesResponse>('/trading/trades/', { params });
    return res.data;
  },

  openTrade: async (payload: {
    symbol: string;
    direction: 'buy' | 'sell';
    stake: number;
    duration_seconds: number;
  }): Promise<{ trade: Trade; wallet: Wallet }> => {
    const res = await api.post<{ trade: Trade; wallet: Wallet }>(
      '/trading/trades/',
      payload
    );
    return res.data;
  },

  settleTrade: async (tradeId: number): Promise<Trade> => {
    const res = await api.post<{ trade: Trade }>('/trading/trades/settle/', {
      trade_id: tradeId,
    });
    return res.data.trade;
  },
};

export default binaryApi;
