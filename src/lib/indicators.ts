import type { Candle } from '../types/binary';

export type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (period <= 0) return out;
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let seed = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (prev === null) {
      seed += v;
      if (i >= period - 1) {
        prev = seed / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export interface Bollinger {
  upper: Series;
  middle: Series;
  lower: Series;
}

export function bollinger(
  values: number[],
  period = 20,
  mult = 2
): Bollinger {
  const middle = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i += 1) {
    const mean = middle[i];
    if (mean === null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      variance += (values[j] - mean) ** 2;
    }
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

export function rsi(values: number[], period = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface Macd {
  macd: Series;
  signal: Series;
  histogram: Series;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): Macd {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: Series = values.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null
      ? (fastEma[i] as number) - (slowEma[i] as number)
      : null
  );
  const macdNumbers = macdLine.map((v) => v ?? 0);
  const signalRaw = ema(macdNumbers, signalPeriod);
  const signal: Series = signalRaw.map((v, i) =>
    macdLine[i] === null ? null : v
  );
  const histogram: Series = macdLine.map((v, i) =>
    v !== null && signal[i] !== null ? v - (signal[i] as number) : null
  );
  return { macd: macdLine, signal, histogram };
}

export function psar(
  candles: Candle[],
  step = 0.02,
  max = 0.2
): Series {
  const out: Series = new Array(candles.length).fill(null);
  if (candles.length < 2) return out;
  let bull = candles[1].close >= candles[0].close;
  let af = step;
  let ep = bull ? candles[0].high : candles[0].low;
  let sar = bull ? candles[0].low : candles[0].high;
  out[0] = sar;
  for (let i = 1; i < candles.length; i += 1) {
    const c = candles[i];
    sar = sar + af * (ep - sar);
    if (bull) {
      sar = Math.min(sar, candles[i - 1].low);
      if (i >= 2) sar = Math.min(sar, candles[i - 2].low);
      if (c.low < sar) {
        bull = false;
        sar = ep;
        ep = c.low;
        af = step;
      } else if (c.high > ep) {
        ep = c.high;
        af = Math.min(max, af + step);
      }
    } else {
      sar = Math.max(sar, candles[i - 1].high);
      if (i >= 2) sar = Math.max(sar, candles[i - 2].high);
      if (c.high > sar) {
        bull = true;
        sar = ep;
        ep = c.high;
        af = step;
      } else if (c.low < ep) {
        ep = c.low;
        af = Math.min(max, af + step);
      }
    }
    out[i] = sar;
  }
  return out;
}

export interface Supertrend {
  line: Series;
  direction: (1 | -1 | null)[];
}

export function supertrend(
  candles: Candle[],
  period = 10,
  mult = 3
): Supertrend {
  const n = candles.length;
  const line: Series = new Array(n).fill(null);
  const direction: (1 | -1 | null)[] = new Array(n).fill(null);
  if (n < period + 1) return { line, direction };

  const atr: Series = new Array(n).fill(null);
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].open;
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - prevClose),
      Math.abs(candles[i].low - prevClose)
    );
  }
  let atrPrev = 0;
  for (let i = 0; i < period; i += 1) atrPrev += tr[i];
  atrPrev /= period;
  atr[period - 1] = atrPrev;
  for (let i = period; i < n; i += 1) {
    atrPrev = (atrPrev * (period - 1) + tr[i]) / period;
    atr[i] = atrPrev;
  }

  const upperBand: number[] = new Array(n).fill(NaN);
  const lowerBand: number[] = new Array(n).fill(NaN);
  const finalUpper: number[] = new Array(n).fill(NaN);
  const finalLower: number[] = new Array(n).fill(NaN);

  for (let i = 0; i < n; i += 1) {
    const a = atr[i];
    if (a === null) continue;
    const mid = (candles[i].high + candles[i].low) / 2;
    upperBand[i] = mid + mult * a;
    lowerBand[i] = mid - mult * a;
  }

  for (let i = period; i < n; i += 1) {
    finalUpper[i] =
      upperBand[i] < finalUpper[i - 1] || candles[i - 1].close > finalUpper[i - 1]
        ? upperBand[i]
        : finalUpper[i - 1];
    finalLower[i] =
      lowerBand[i] > finalLower[i - 1] || candles[i - 1].close < finalLower[i - 1]
        ? lowerBand[i]
        : finalLower[i - 1];
  }

  let dir: 1 | -1 = 1;
  for (let i = period; i < n; i += 1) {
    if (candles[i].close > finalUpper[i - 1]) dir = 1;
    else if (candles[i].close < finalLower[i - 1]) dir = -1;
    direction[i] = dir;
    line[i] = dir === 1 ? finalLower[i] : finalUpper[i];
  }

  return { line, direction };
}
