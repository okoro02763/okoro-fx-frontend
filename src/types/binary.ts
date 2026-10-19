export type Category = 'currencies' | 'crypto' | 'commodities' | 'stocks';
export type Direction = 'buy' | 'sell';
export type TradeStatus = 'open' | 'won' | 'lost' | 'refund';
export type ChartType = 'candles' | 'area' | 'bars' | 'heikin-ashi';

/** A single raw market tick used to build candles. `time` is unix seconds. */
export interface Tick {
  time: number;
  price: number;
}

/** Connection state of the live price feed. */
export type ConnectionStatus = 'connecting' | 'live' | 'offline';

/** Where the current price/candle data came from. */
export type MarketSource = 'binance' | 'backend' | 'none';

/** Technical overlays/indicators offered in the terminal. */
export type IndicatorKey =
  | 'ma'
  | 'bollinger'
  | 'rsi'
  | 'macd'
  | 'psar'
  | 'supertrend';

export const INDICATOR_LABELS: { key: IndicatorKey; label: string }[] = [
  { key: 'ma', label: 'Moving Average' },
  { key: 'bollinger', label: 'Bollinger Bands' },
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'psar', label: 'Parabolic SAR' },
  { key: 'supertrend', label: 'Supertrend' },
];

export interface Instrument {
  id: number;
  symbol: string;
  name: string;
  category: Category;
  category_display: string;
  payout_percent: string;
  payout_percent_short?: string;
  payout_percent_long?: string;
  is_active: boolean;
  sort_order: number;
  price?: number;
  percent_change?: number;
  source?: string;
}

export interface Quote {
  symbol: string;
  name?: string;
  price: number;
  prev_close: number;
  open: number;
  high: number;
  low: number;
  change: number;
  percent_change: number;
  timestamp: number;
  source: string;
  payout_percent?: number;
  category?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Trade {
  id: number;
  symbol: string;
  instrument_name: string;
  category: string;
  direction: Direction;
  direction_display: string;
  status: TradeStatus;
  status_display: string;
  stake: string;
  payout_percent: string;
  gross_payout: string;
  potential_profit: number;
  profit: string;
  open_price: string;
  close_price: string | null;
  expiry_time: string;
  created_at: string;
  settled_at: string | null;
  seconds_remaining: number;
}

export interface Wallet {
  demo_balance: string;
  updated_at: string;
}
