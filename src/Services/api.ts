import axios from 'axios';
import type {
  CurrencyPair, LivePrice, PriceHistory, TechnicalAnalysis,
  Trade, PortfolioSummary, TradeRequest,
  DerivStatus, AccountInfo
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://forex-trader-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Existing methods...
  getCurrencyPairs: async (): Promise<CurrencyPair[]> => {
    const response = await api.get('/currency-pairs/');
    return response.data;
  },

  getLivePrices: async (): Promise<LivePrice[]> => {
    const response = await api.get('/live-prices/');
    return response.data;
  },

  getPriceHistory: async (symbol: string): Promise<PriceHistory[]> => {
    const response = await api.get(`/price-history/${symbol}/`);
    return response.data;
  },

  getTechnicalAnalysis: async (symbol: string): Promise<TechnicalAnalysis> => {
    const response = await api.get(`/technical-analysis/${symbol}/`);
    return response.data;
  },

  placeTrade: async (tradeData: TradeRequest): Promise<any> => {
    const response = await api.post('/place-trade/', tradeData);
    return response.data;
  },

  closeTrade: async (tradeId: number): Promise<any> => {
    const response = await api.post(`/close-trade/${tradeId}/`);
    return response.data;
  },

  getTrades: async (): Promise<Trade[]> => {
    const response = await api.get('/trades/');
    return response.data;
  },

  getPortfolioSummary: async (): Promise<PortfolioSummary> => {
    const response = await api.get('/portfolio/');
    return response.data;
  },

  // New Deriv-specific methods
  getDerivStatus: async (): Promise<DerivStatus> => {
    const response = await api.get('/deriv-status/');
    return response.data;
  },

  getAccountInfo: async (): Promise<AccountInfo> => {
    const response = await api.get('/account-info/');
    return response.data;
  },
};

export default apiService;