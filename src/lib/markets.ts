/**
 * Mapping between our instrument symbols and the Binance public market feed.
 *
 * The Django backend serves a simulated sine-wave feed when no upstream key is
 * configured, which is fine for a demo but produces a chart that swings between
 * ~56k and ~80k. For a usable chart we stream real prices from Binance's public
 * (keyless) WebSocket/REST unless the backend explicitly provides its own
 * `REACT_APP_WS_URL`.
 */

/** Our symbol -> Binance stream symbol (lower-case, no slash). */
const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC/USD': 'btcusdt',
  'ETH/USD': 'ethusdt',
  'BNB/USD': 'bnbusdt',
  'SOL/USD': 'solusdt',
  'XRP/USD': 'xrpusdt',
  'ADA/USD': 'adausdt',
  'DOGE/USD': 'dogeusdt',
  'LTC/USD': 'ltcusdt',
  'EUR/USD': 'eurusdt',
  'GBP/USD': 'gbpusdt',
  'AUD/USD': 'audusdt',
};

/** Returns the Binance symbol for our instrument, or null if unsupported. */
export function toBinanceSymbol(symbol: string): string | null {
  return BINANCE_SYMBOLS[symbol] ?? null;
}

export interface BinanceInterval {
  /** Binance kline interval used for history (e.g. '1s', '1m', '1h'). */
  interval: string;
  /** Seconds of the kline interval, used to resample if needed. */
  seconds: number;
}

const BINANCE_INTERVALS: Record<number, BinanceInterval> = {
  5: { interval: '1s', seconds: 1 },
  10: { interval: '1s', seconds: 1 },
  15: { interval: '1s', seconds: 1 },
  30: { interval: '1s', seconds: 1 },
  60: { interval: '1m', seconds: 60 },
  120: { interval: '1m', seconds: 60 },
  180: { interval: '1m', seconds: 60 },
  300: { interval: '5m', seconds: 300 },
  600: { interval: '5m', seconds: 300 },
  900: { interval: '15m', seconds: 900 },
  1800: { interval: '30m', seconds: 1800 },
  3600: { interval: '1h', seconds: 3600 },
  14400: { interval: '4h', seconds: 14400 },
  86400: { interval: '1d', seconds: 86400 },
};

/** Closest Binance kline interval for one of our timeframe lengths. */
export function toBinanceInterval(timeframeSeconds: number): BinanceInterval {
  if (BINANCE_INTERVALS[timeframeSeconds]) {
    return BINANCE_INTERVALS[timeframeSeconds];
  }
  // Pick the finest standard interval that divides the requested frame.
  const standard = [1, 60, 300, 900, 1800, 3600, 14400, 86400];
  let best = { interval: '1m', seconds: 60 };
  for (const s of standard) {
    if (s <= timeframeSeconds && timeframeSeconds % s === 0) {
      best = BINANCE_INTERVALS[s];
    }
  }
  return best;
}

export const BINANCE_REST = 'https://api.binance.com';
export const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

/** Timeframes shorter than a minute can only be built from live ticks. */
export function isSubMinute(timeframeSeconds: number): boolean {
  return timeframeSeconds < 60;
}
