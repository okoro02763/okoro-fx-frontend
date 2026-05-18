// Currency Pair
export interface CurrencyPair {
  id: number;
  symbol: string;
  name: string;
}

// Trade Request
export interface TradeRequest {
  symbol: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  stop_loss?: number;
  take_profit?: number;
}

// Trade
export interface Trade {
  id: number;
  symbol: string;
  trade_type: 'BUY' | 'SELL';
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  profit_loss?: number;
  opened_at: string;
  closed_at?: string;
  deriv_contract_id?: string;
}

// Deriv Status
export interface DerivStatus {
  connected: boolean;
  api_url: string | null;
  subscriptions: number;
  supported_pairs: string[];
}

// Deriv Account
export interface DerivAccount {
  account_id: string;
  currency: string;
  balance: number;
  is_demo: boolean;
  last_updated: string;
}

// Account Info
export interface AccountInfo {
  accounts: DerivAccount[];
  deriv_connected: boolean;
}

// Portfolio Summary
export interface PortfolioSummary {
  total_profit_loss: number;
  open_positions: number;
  total_trades: number;
  win_rate: number;
  deriv_connected: boolean;
}

// Live Price
export interface LivePrice {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: string;
}

// Price History
export interface PriceHistory {
  timestamp: string;
  bid: number;
  ask: number;
  close: number;
}

// Technical Analysis
export interface TechnicalAnalysis {
  symbol: string;
  current_price: number;
  sma_20: number | null;
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  data_source: string;
}