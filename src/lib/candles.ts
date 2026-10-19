import type { Candle, Tick } from '../types/binary';

/**
 * Bucket raw ticks into OHLC candles for a timeframe.
 *
 * Ticks are grouped by `floor(timestamp / timeframeSeconds) * timeframeSeconds`
 * so a "5m" candle contains every tick that arrived in that 5-minute window.
 * Output is sorted ascending with unique, bucket-aligned times.
 */
export function aggregateCandles(
  ticks: Tick[],
  timeframeSeconds: number
): Candle[] {
  if (!Number.isFinite(timeframeSeconds) || timeframeSeconds <= 0) return [];

  const buckets = new Map<number, Candle>();
  const sorted = ticks
    .filter((t) => Number.isFinite(t.time) && Number.isFinite(t.price))
    .slice()
    .sort((a, b) => a.time - b.time);

  for (const tick of sorted) {
    const bucket = Math.floor(tick.time / timeframeSeconds) * timeframeSeconds;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        time: bucket,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
      });
    } else {
      existing.high = Math.max(existing.high, tick.price);
      existing.low = Math.min(existing.low, tick.price);
      existing.close = tick.price;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/**
 * Resample already-built candles onto a coarser timeframe. Useful for history
 * that arrives as OHLC (e.g. Binance klines) rather than raw ticks, because it
 * preserves each source candle's high/low.
 */
export function resampleCandles(
  candles: Candle[],
  timeframeSeconds: number
): Candle[] {
  if (!Number.isFinite(timeframeSeconds) || timeframeSeconds <= 0) return [];

  const buckets = new Map<number, Candle>();
  const sorted = candles
    .slice()
    .sort((a, b) => a.time - b.time);

  for (const c of sorted) {
    const bucket = Math.floor(c.time / timeframeSeconds) * timeframeSeconds;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, { ...c, time: bucket });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/** The bucket start (unix seconds) a timestamp falls inside. */
export function bucketStart(timeSeconds: number, timeframeSeconds: number): number {
  return Math.floor(timeSeconds / timeframeSeconds) * timeframeSeconds;
}

/**
 * Apply a live tick to a candle array, mutating the shared last candle while
 * the tick still belongs to its bucket and appending a fresh candle once the
 * bucket rolls over. Returns the new array (never mutates the input).
 */
export function applyTick(
  candles: Candle[],
  tick: Tick,
  timeframeSeconds: number
): Candle[] {
  if (!Number.isFinite(tick.price) || tick.price <= 0) return candles;
  const bucket = bucketStart(tick.time, timeframeSeconds);
  const last = candles.length ? candles[candles.length - 1] : null;

  if (last && bucket <= last.time) {
    const updated: Candle = {
      ...last,
      high: Math.max(last.high, tick.price),
      low: Math.min(last.low, tick.price),
      close: tick.price,
    };
    return [...candles.slice(0, -1), updated];
  }

  return [
    ...candles,
    {
      time: bucket,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
    },
  ];
}

/**
 * Remove duplicate times and enforce ascending order — lightweight-charts
 * rejects unsorted or duplicated timestamps.
 */
export function normalizeCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const c of candles) {
    if (!Number.isFinite(c.time)) continue;
    byTime.set(c.time, c);
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}
