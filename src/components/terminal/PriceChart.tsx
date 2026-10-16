import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type {
  Candle,
  ChartType,
  Direction,
  Quote,
  Trade,
  TradeStatus,
} from '../../types/binary';
import {
  formatClock,
  formatCountdown,
  formatMoney,
} from '../../lib/format';

const UP = '#38D9A9';
const DOWN = '#FF6B6B';
const GRID = 'rgba(39, 44, 71, 0.5)';
const BORDER = '#272C47';
const TEXT = '#868CA8';
const LIVE = '#4C9AFF';
// How long a settled-trade result bubble stays on the chart.
const BUBBLE_MS = 8000;
// Cap how far the time scale is extended into the future so a long expiry
// cannot squash the candles.
const MAX_EXTEND_BARS = 240;

type AnySeries =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Bar'>
  | ISeriesApi<'Area'>;

interface PriceChartProps {
  symbol: string;
  candles: Candle[];
  chartType: ChartType;
  intervalSeconds: number;
  tick: Quote | null;
  trades?: Trade[];
  now?: number;
}

interface TradeOverlay {
  id: number;
  status: TradeStatus;
  direction: Direction;
  entry: number;
  openTime: number;
  expiryTime: number;
  settledAt: number | null;
  profit: number;
  openX: number | null;
  expiryX: number | null;
  entryY: number | null;
  winning: boolean;
}

function heikinAshiBar(c: Candle, prev?: Candle): Candle {
  const close = (c.open + c.high + c.low + c.close) / 4;
  const open = prev ? (prev.open + prev.close) / 2 : (c.open + c.close) / 2;
  return {
    time: c.time,
    open,
    high: Math.max(c.high, open, close),
    low: Math.min(c.low, open, close),
    close,
  };
}

function toHeikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += 1) {
    out.push(heikinAshiBar(candles[i], out[i - 1]));
  }
  return out;
}

function setSeriesData(series: AnySeries, bars: Candle[], type: ChartType) {
  if (type === 'area') {
    (series as ISeriesApi<'Area'>).setData(
      bars.map((b) => ({ time: b.time as UTCTimestamp, value: b.close }))
    );
    return;
  }
  (series as ISeriesApi<'Candlestick'>).setData(
    bars.map((b) => ({
      time: b.time as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }))
  );
}

function updateSeriesPoint(series: AnySeries, bar: Candle, type: ChartType) {
  if (type === 'area') {
    (series as ISeriesApi<'Area'>).update({
      time: bar.time as UTCTimestamp,
      value: bar.close,
    });
    return;
  }
  (series as ISeriesApi<'Candlestick'>).update({
    time: bar.time as UTCTimestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
  });
}

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

const clampX = (x: number, width: number) =>
  Math.min(Math.max(x, 52), Math.max(52, width - 52));

const labelStyle: React.CSSProperties = {
  position: 'absolute',
  whiteSpace: 'nowrap',
  fontSize: 10,
  fontFamily: 'Inter, sans-serif',
  color: '#B8BDD0',
  backgroundColor: 'rgba(13,15,26,0.78)',
  border: '1px solid rgba(39,44,71,0.9)',
  borderRadius: 4,
  padding: '1px 5px',
  transform: 'translateX(-50%)',
  lineHeight: 1.4,
};

export default function PriceChart({
  symbol,
  candles,
  chartType,
  intervalSeconds,
  tick,
  trades = [],
  now,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<AnySeries | null>(null);
  const extSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const lastPriceRef = useRef<number>(0);
  const barsRef = useRef<Candle[]>([]);
  const haPrevRef = useRef<Candle | null>(null);
  const haCurrentRef = useRef<Candle | null>(null);
  const intervalRef = useRef(intervalSeconds);
  const typeRef = useRef(chartType);

  const [clock, setClock] = useState(() => Date.now());
  const [overlays, setOverlays] = useState<TradeOverlay[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const nowMs = now ?? clock;

  // Create the chart once and keep it sized to its container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0D0F1A' },
        textColor: TEXT,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: BORDER },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: intervalSeconds < 60,
      },
    });
    chartRef.current = chart;

    // An invisible series used only to extend the time scale into the future
    // so an open trade's expiry line has a coordinate before it arrives.
    extSeriesRef.current = chart.addLineSeries({
      color: 'rgba(0,0,0,0)',
      lineVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      extSeriesRef.current = null;
      priceLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (Re)build the series whenever the chart type changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    priceLineRef.current = null;
    let series: AnySeries;
    if (chartType === 'area') {
      series = chart.addAreaSeries({
        lineColor: UP,
        topColor: 'rgba(56, 217, 169, 0.32)',
        bottomColor: 'rgba(56, 217, 169, 0.02)',
        lineWidth: 2,
      });
    } else if (chartType === 'bars') {
      series = chart.addBarSeries({ upColor: UP, downColor: DOWN });
    } else {
      series = chart.addCandlestickSeries({
        upColor: UP,
        downColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
      });
    }
    seriesRef.current = series;
    typeRef.current = chartType;

    // Live-price marker: a dashed blue line with the price tag on the axis.
    if (lastPriceRef.current > 0) {
      priceLineRef.current = series.createPriceLine({
        price: lastPriceRef.current,
        color: LIVE,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    }
  }, [chartType]);

  // Load data when candles/type/interval change, and extend the time scale to
  // the furthest open-trade expiry so its vertical line can be drawn.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    intervalRef.current = intervalSeconds;
    barsRef.current = candles.slice();
    const bars = chartType === 'heikin-ashi' ? toHeikinAshi(candles) : candles;
    haPrevRef.current = bars.length >= 2 ? bars[bars.length - 2] : null;
    haCurrentRef.current = bars.length >= 1 ? bars[bars.length - 1] : null;
    setSeriesData(series, bars, chartType);
    if (bars.length) {
      lastPriceRef.current = bars[bars.length - 1].close;
      priceLineRef.current?.applyOptions({ price: lastPriceRef.current });
    }

    const ext = extSeriesRef.current;
    if (ext) {
      const lastTime = bars.length ? bars[bars.length - 1].time : null;
      const maxExpiry = trades
        .filter((t) => t.symbol === symbol && t.status === 'open')
        .map((t) => Math.floor(new Date(t.expiry_time).getTime() / 1000))
        .reduce<number | null>(
          (acc, v) => (acc === null || v > acc ? v : acc),
          null
        );
      const whitespace: { time: UTCTimestamp }[] = [];
      if (lastTime !== null && maxExpiry !== null) {
        const step = Math.max(1, intervalSeconds);
        const limit = Math.min(
          maxExpiry,
          lastTime + MAX_EXTEND_BARS * step
        );
        for (let t = lastTime + step; t <= limit; t += step) {
          whitespace.push({ time: t as UTCTimestamp });
        }
      }
      ext.setData(whitespace);
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, chartType, intervalSeconds, trades, symbol]);

  // Merge each live tick into the newest candle and move the live price line.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !tick || !tick.price || tick.price <= 0) return;

    lastPriceRef.current = tick.price;
    if (!priceLineRef.current) {
      priceLineRef.current = series.createPriceLine({
        price: tick.price,
        color: LIVE,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    } else {
      priceLineRef.current.applyOptions({ price: tick.price });
    }

    const step = intervalRef.current;
    const bucket = Math.floor(tick.timestamp / step) * step;
    const type = typeRef.current;
    let bar: Candle;
    const bars = barsRef.current;

    if (bars.length && bucket <= bars[bars.length - 1].time) {
      const last: Candle = { ...bars[bars.length - 1] };
      last.close = tick.price;
      last.high = Math.max(last.high, tick.price);
      last.low = Math.min(last.low, tick.price);
      barsRef.current = [...bars.slice(0, -1), last];
      if (type === 'heikin-ashi') {
        bar = heikinAshiBar(last, haPrevRef.current ?? undefined);
        haCurrentRef.current = bar;
      } else {
        bar = last;
      }
    } else {
      const fresh: Candle = {
        time: bucket,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
      };
      barsRef.current = [...bars, fresh];
      if (type === 'heikin-ashi') {
        haPrevRef.current = haCurrentRef.current;
        bar = heikinAshiBar(fresh, haCurrentRef.current ?? undefined);
        haCurrentRef.current = bar;
      } else {
        bar = fresh;
      }
    }

    updateSeriesPoint(series, bar, type);
  }, [tick]);

  // Buy/Sell arrows at each open trade's entry point.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const markers: SeriesMarker<Time>[] = trades
      .filter((t) => t.symbol === symbol && t.status === 'open')
      .map<SeriesMarker<Time>>((t) => ({
        time: Math.floor(new Date(t.created_at).getTime() / 1000) as UTCTimestamp,
        position: t.direction === 'buy' ? 'belowBar' : 'aboveBar',
        color: t.direction === 'buy' ? UP : DOWN,
        shape: t.direction === 'buy' ? 'arrowUp' : 'arrowDown',
        text: '',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    series.setMarkers(markers);
  }, [trades, symbol, chartType, candles]);

  // Recompute overlay pixel positions from chart coordinates.
  const layout = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const ts = chart.timeScale();
    const live = lastPriceRef.current;
    const next: TradeOverlay[] = trades
      .filter((t) => t.symbol === symbol)
      .map((t) => {
        const openTime = parseTime(t.created_at) ?? 0;
        const expiryTime = parseTime(t.expiry_time) ?? 0;
        const entry = parseFloat(t.open_price);
        const openX = ts.timeToCoordinate(
          Math.floor(openTime / 1000) as UTCTimestamp
        );
        const expiryX = ts.timeToCoordinate(
          Math.floor(expiryTime / 1000) as UTCTimestamp
        );
        const entryY = series.priceToCoordinate(entry);
        const winning =
          t.status === 'won'
            ? true
            : t.status === 'lost'
            ? false
            : t.direction === 'buy'
            ? live > entry
            : live < entry;
        return {
          id: t.id,
          status: t.status,
          direction: t.direction,
          entry,
          openTime,
          expiryTime,
          settledAt: parseTime(t.settled_at),
          profit: parseFloat(t.profit),
          openX,
          expiryX,
          entryY,
          winning,
        };
      });
    setOverlays(next);
  }, [trades, symbol]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Recompute on data/clock changes and on pan/zoom.
  useEffect(() => {
    layout();
  }, [layout, tick, clock, candles, chartType, intervalSeconds]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const ts = chart.timeScale();
    const handler = () => layoutRef.current();
    ts.subscribeVisibleLogicalRangeChange(handler);
    return () => ts.unsubscribeVisibleLogicalRangeChange(handler);
  }, []);

  // Internal 1s clock keeps countdowns/bubbles live even without a parent clock.
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const paneWidth = containerRef.current?.clientWidth ?? 0;

  const dismissBubble = (id: number) =>
    setDismissed((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(id);
      return nextSet;
    });

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      <div
        className="pointer-events-none absolute left-3 top-2 z-10 text-[11px] font-medium"
        style={{ color: 'rgba(134,140,168,0.55)', fontFamily: 'Space Grotesk' }}
      >
        {symbol}
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5]">
        {overlays.map((o) => {
          const lineColor = o.winning ? UP : DOWN;
          const hLeft = o.openX ?? 0;
          const hRight = o.expiryX ?? paneWidth;
          const width = Math.max(0, hRight - hLeft);
          const showBubble =
            o.status !== 'open' &&
            o.settledAt !== null &&
            nowMs - o.settledAt < BUBBLE_MS &&
            !dismissed.has(o.id);

          return (
            <Fragment key={o.id}>
              {o.openX !== null && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: o.openX,
                      top: 0,
                      bottom: 0,
                      borderLeft: '1px dashed rgba(134,140,168,0.55)',
                    }}
                  />
                  <div style={{ ...labelStyle, left: clampX(o.openX, paneWidth), top: 6 }}>
                    Beginning of trade · {formatClock(o.openTime)}
                  </div>
                </>
              )}

              {o.expiryX !== null && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: o.expiryX,
                      top: 0,
                      bottom: 0,
                      borderLeft: `1px solid ${
                        o.status === 'open'
                          ? 'rgba(232,180,84,0.9)'
                          : lineColor
                      }`,
                    }}
                  />
                  <div style={{ ...labelStyle, left: clampX(o.expiryX, paneWidth), top: 26 }}>
                    End of trade
                    {o.status === 'open'
                      ? ` · ${formatCountdown((o.expiryTime - nowMs) / 1000)}`
                      : ''}
                  </div>
                </>
              )}

              {o.entryY !== null && o.openX !== null && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: hLeft,
                      top: o.entryY,
                      width,
                      borderTop: `2px solid ${lineColor}`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: o.openX - 3,
                      top: o.entryY - 3,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: lineColor,
                    }}
                  />
                  {o.expiryX !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: o.expiryX - 4,
                        top: o.entryY - 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 0 1px rgba(13,15,26,0.8)',
                      }}
                    />
                  )}
                </>
              )}

              {showBubble && (
                <div
                  className="pointer-events-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-xl"
                  style={{
                    position: 'absolute',
                    left: clampX(o.expiryX ?? paneWidth - 60, paneWidth),
                    top: Math.max(36, (o.entryY ?? 60) - 54),
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--panel2)',
                    border: `1px solid ${lineColor}`,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 10, color: 'var(--sub)' }}>
                    RESULT (
                    <span style={{ color: lineColor, fontWeight: 700 }}>
                      {o.profit >= 0 ? '+' : '-'}
                      {formatMoney(Math.abs(o.profit))}
                    </span>
                    )
                  </span>
                  <button
                    type="button"
                    aria-label="Dismiss result"
                    onClick={() => dismissBubble(o.id)}
                  >
                    <X size={12} color="var(--sub)" />
                  </button>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
