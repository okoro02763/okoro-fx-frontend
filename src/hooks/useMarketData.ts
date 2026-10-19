import { useCallback, useEffect, useRef, useState } from 'react';
import binaryApi from '../api/binary';
import {
  aggregateCandles,
  applyTick,
  normalizeCandles,
  resampleCandles,
} from '../lib/candles';
import {
  BINANCE_REST,
  BINANCE_WS,
  isSubMinute,
  toBinanceInterval,
  toBinanceSymbol,
} from '../lib/markets';
import type {
  Candle,
  ConnectionStatus,
  MarketSource,
  Tick,
} from '../types/binary';

/** Backend WebSocket for our own Django feed, if one is configured. */
const BACKEND_WS_URL = process.env.REACT_APP_WS_URL || '';
/** A feed is considered offline after this many ms without a tick. */
const OFFLINE_AFTER_MS = 5000;
/** How many raw ticks to keep for sub-minute candle building. */
const TICK_BUFFER = 4000;
/** How many history candles to request by default. */
const HISTORY_LIMIT = 500;
/** Number of candles to keep for sub-minute frames. */
const SUB_MINUTE_BARS = 200;

export interface MarketData {
  candles: Candle[];
  price: number;
  change24h: number;
  status: ConnectionStatus;
  source: MarketSource;
  lastTickAt: number | null;
  error: string | null;
  fallbackMessage: string | null;
  loading: boolean;
  reload: () => void;
}

type BinanceKline = Array<string | number>;

function klinesToCandles(rows: BinanceKline[]): Candle[] {
  return normalizeCandles(
    rows
      .map((row) => ({
        time: Math.floor(Number(row[0]) / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
      }))
      .filter((c) => Number.isFinite(c.time))
  );
}

/**
 * Live market data for one instrument.
 *
 * Prefers the backend WebSocket when `REACT_APP_WS_URL` is set, otherwise
 * streams the Binance public feed for supported symbols. Candles are always
 * aggregated to the selected timeframe — either resampled from exchange OHLC
 * history or bucketed from raw ticks via `aggregateCandles`.
 */
export function useMarketData(
  symbol: string,
  timeframeSeconds: number
): MarketData {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [price, setPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [source, setSource] = useState<MarketSource>('none');
  const [lastTickAt, setLastTickAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const candlesRef = useRef<Candle[]>([]);
  const ticksRef = useRef<Tick[]>([]);
  const open24hRef = useRef<number>(0);
  const lastTickRef = useRef<number | null>(null);
  const timeframeRef = useRef(timeframeSeconds);
  const lastPriceRef = useRef(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    timeframeRef.current = timeframeSeconds;
  }, [timeframeSeconds]);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let candleTimer: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;

    // reset per symbol/timeframe
    candlesRef.current = [];
    ticksRef.current = [];
    lastPriceRef.current = 0;
    setCandles([]);
    setPrice(0);
    setChange24h(0);
    setLastTickAt(null);
    setError(null);
    setFallbackMessage(null);
    setStatus('connecting');
    setLoading(true);

    const useBackend = Boolean(BACKEND_WS_URL);
    const binanceSymbol = useBackend ? null : toBinanceSymbol(symbol);
    const activeSource: MarketSource = useBackend
      ? 'backend'
      : binanceSymbol
      ? 'binance'
      : 'backend';
    setSource(activeSource);

    const pushTick = (tick: Tick, priceOnly = false) => {
      if (cancelled || !Number.isFinite(tick.price) || tick.price <= 0) return;
      const now = Date.now();
      lastTickRef.current = now;
      lastPriceRef.current = tick.price;
      setLastTickAt(now);
      setPrice(tick.price);
      setStatus('live');
      if (open24hRef.current > 0) {
        setChange24h(
          ((tick.price - open24hRef.current) / open24hRef.current) * 100
        );
      }
      if (priceOnly) return;

      const tf = timeframeRef.current;
      if (isSubMinute(tf)) {
        const buf = ticksRef.current;
        buf.push(tick);
        if (buf.length > TICK_BUFFER) buf.splice(0, buf.length - TICK_BUFFER);
        const bars = aggregateCandles(buf, tf).slice(-SUB_MINUTE_BARS);
        candlesRef.current = bars;
        setCandles(bars);
      } else {
        const next = applyTick(candlesRef.current, tick, tf);
        candlesRef.current = next;
        setCandles(next);
      }
    };

    const fetchBinanceHistory = async () => {
      if (!binanceSymbol) return;
      const tf = timeframeRef.current;
      const { interval, seconds } = toBinanceInterval(tf);
      try {
        const url = `${BINANCE_REST}/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${interval}&limit=${HISTORY_LIMIT}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Binance history responded ${res.status}`);
        const rows = (await res.json()) as BinanceKline[];
        if (cancelled) return;
        const raw = klinesToCandles(rows);
        const bars =
          seconds < tf ? resampleCandles(raw, tf) : raw;
        // Seed the tick buffer from history so sub-minute frames have context.
        if (isSubMinute(tf)) {
          ticksRef.current = bars
            .flatMap((c) => [
              { time: c.time, price: c.open },
              { time: c.time, price: c.high },
              { time: c.time, price: c.low },
              { time: c.time, price: c.close },
            ])
            .slice(-TICK_BUFFER);
        }
        candlesRef.current = bars;
        setCandles(bars);
        if (bars.length) {
          lastPriceRef.current = bars[bars.length - 1].close;
          setPrice(bars[bars.length - 1].close);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Could not load history');
        setFallbackMessage(
          'Live prices are unavailable from the exchange. Showing the best available data.'
        );
        setLoading(false);
      }
    };

    const fetchBinanceChange = async () => {
      if (!binanceSymbol) return;
      try {
        const res = await fetch(
          `${BINANCE_REST}/api/v3/ticker/24hr?symbol=${binanceSymbol.toUpperCase()}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          openPrice?: string;
          priceChangePercent?: string;
        };
        if (cancelled) return;
        const open = Number(data.openPrice);
        if (open > 0) {
          open24hRef.current = open;
          const current = lastPriceRef.current || Number(data.openPrice);
          setChange24h(((current - open) / open) * 100);
        } else if (data.priceChangePercent) {
          setChange24h(Number(data.priceChangePercent));
        }
      } catch {
        /* non-fatal */
      }
    };

    const fetchBackendHistory = async () => {
      const tf = timeframeRef.current;
      const key = tf >= 3600 ? '1h' : tf >= 900 ? '15m' : tf >= 300 ? '5m' : '1m';
      try {
        const rows = await binaryApi.getCandles(symbol, key, HISTORY_LIMIT);
        if (cancelled) return;
        const bars = normalizeCandles(rows);
        candlesRef.current = bars;
        setCandles(bars);
        if (bars.length) {
          lastPriceRef.current = bars[bars.length - 1].close;
          setPrice(bars[bars.length - 1].close);
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Could not load history');
        setLoading(false);
      }
    };

    // --- history ---
    if (activeSource === 'binance') {
      void fetchBinanceHistory();
      void fetchBinanceChange();
    } else {
      void fetchBackendHistory();
    }

    // --- live feed ---
    const connectBinance = () => {
      if (cancelled || !binanceSymbol) return;
      const url = `${BINANCE_WS}/${binanceSymbol}@trade`;
      try {
        socket = new WebSocket(url);
      } catch {
        setStatus('offline');
        return;
      }
      socket.onopen = () => {
        attempt = 0;
        setStatus('live');
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            e?: string;
            p?: string;
            T?: number;
          };
          if (data.e === 'trade' && data.p) {
            pushTick({
              time: Math.floor((data.T ?? Date.now()) / 1000),
              price: Number(data.p),
            });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onerror = () => {
        setError('Live connection error');
      };
      socket.onclose = () => {
        socket = null;
        if (cancelled) return;
        setStatus('connecting');
        attempt += 1;
        const delay = Math.min(10000, 500 * 2 ** Math.min(attempt, 5));
        retryTimer = setTimeout(connectBinance, delay);
      };
    };

    const connectBackend = () => {
      if (cancelled) return;
      const base = BACKEND_WS_URL.replace(/^http/, 'ws').replace(/\/$/, '');
      const url = `${base}/ws/prices/${symbol}/`;
      try {
        socket = new WebSocket(url);
      } catch {
        setStatus('offline');
        return;
      }
      socket.onopen = () => {
        attempt = 0;
        setStatus('live');
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            price?: number;
            timestamp?: number;
            open?: number;
          };
          if ((data.type === 'tick' || data.type === 'snapshot') && data.price) {
            if (data.open && data.open > 0) open24hRef.current = data.open;
            pushTick({
              time: data.timestamp ?? Math.floor(Date.now() / 1000),
              price: data.price,
            });
          }
        } catch {
          /* ignore */
        }
      };
      socket.onerror = () => setError('Live connection error');
      socket.onclose = () => {
        socket = null;
        if (cancelled) return;
        setStatus('connecting');
        attempt += 1;
        const delay = Math.min(10000, 500 * 2 ** Math.min(attempt, 5));
        retryTimer = setTimeout(connectBackend, delay);
      };
    };

    if (activeSource === 'binance') {
      connectBinance();
    } else if (useBackend) {
      connectBackend();
    } else {
      // No realtime feed for this instrument: poll the backend on a timer.
      setStatus('connecting');
      candleTimer = setInterval(() => {
        void fetchBackendHistory();
      }, 30000);
      // Mark live briefly so the UI is not stuck "connecting".
      setStatus('live');
    }

    // --- offline watchdog ---
    const watchdog = setInterval(() => {
      const last = lastTickRef.current;
      if (last === null) return;
      if (Date.now() - last > OFFLINE_AFTER_MS) {
        setStatus('offline');
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(watchdog);
      if (candleTimer) clearInterval(candleTimer);
      if (retryTimer) clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onopen = null;
        socket.close();
      }
    };
  }, [symbol, timeframeSeconds, reloadKey]);

  return {
    candles,
    price,
    change24h,
    status,
    source,
    lastTickAt,
    error,
    fallbackMessage,
    loading,
    reload,
  };
}

export default useMarketData;
