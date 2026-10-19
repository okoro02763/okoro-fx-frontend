import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type {
  Candle,
  ChartType,
  Direction,
  IndicatorKey,
  Trade,
  TradeStatus,
} from '../../types/binary';
import { bollinger, psar, sma, supertrend } from '../../lib/indicators';
import { formatClock, formatCountdown, formatMoney } from '../../lib/format';
import MiniChart, { type LogicalRange } from './MiniChart';

const UP = '#0fb360';
const DOWN = '#ef5a4c';
const GRID = 'rgba(54, 60, 88, 0.35)';
const BORDER = '#363c58';
const TEXT = '#8a90a8';
const BLUE = '#2b8cff';
const AMBER = '#ff9f1a';
const BG = '#1a1f33';
// How long a settled-trade result bubble stays on the chart.
const BUBBLE_MS = 8000;

type MainSeries =
  | ISeriesApi<'Candlestick'>
  | ISeriesApi<'Bar'>
  | ISeriesApi<'Area'>;

type OverlayId = string;

interface PriceChartProps {
  symbol: string;
  candles: Candle[];
  chartType: ChartType;
  intervalSeconds: number;
  price: number;
  trades?: Trade[];
  now?: number;
  indicators?: IndicatorKey[];
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

function setMainData(series: MainSeries, bars: Candle[], type: ChartType) {
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

function toLineData(
  candles: Candle[],
  values: (number | null)[]
): LineData[] {
  const out: LineData[] = [];
  values.forEach((v, i) => {
    if (v === null || !candles[i]) return;
    out.push({ time: candles[i].time as UTCTimestamp, value: v });
  });
  return out;
}

function parseTime(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

const clampX = (x: number, width: number) =>
  Math.min(Math.max(x, 56), Math.max(56, width - 56));

const labelStyle: React.CSSProperties = {
  position: 'absolute',
  whiteSpace: 'nowrap',
  fontSize: 10,
  fontFamily: 'Inter, sans-serif',
  color: '#c8cde0',
  backgroundColor: 'rgba(26,31,51,0.9)',
  border: '1px solid rgba(54,60,88,0.9)',
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
  price,
  trades = [],
  now,
  indicators = [],
}: PriceChartProps) {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeries | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const overlaysRef = useRef<Map<OverlayId, ISeriesApi<'Line'>>>(new Map());
  const mainRangeRef = useRef<LogicalRange>(null);
  const rsiSyncRef = useRef<((range: LogicalRange) => void) | null>(null);
  const macdSyncRef = useRef<((range: LogicalRange) => void) | null>(null);
  const fitDoneRef = useRef(false);
  const lastPriceRef = useRef(0);

  const [clock, setClock] = useState(() => Date.now());
  const [overlays, setOverlays] = useState<TradeOverlay[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const nowMs = now ?? clock;
  const subPanes =
    (indicators.includes('rsi') ? 1 : 0) + (indicators.includes('macd') ? 1 : 0);
  const hasSubPane = subPanes > 0;

  const bars = useMemo(
    () => (chartType === 'heikin-ashi' ? toHeikinAshi(candles) : candles),
    [candles, chartType]
  );

  // Create the main chart once and keep it sized to its container.
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: TEXT,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: BORDER, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: intervalSeconds < 60,
        rightOffset: 6,
      },
    });
    chartRef.current = chart;

    const observer = new ResizeObserver(() => {
      if (mainContainerRef.current) {
        chart.applyOptions({
          width: mainContainerRef.current.clientWidth,
          height: mainContainerRef.current.clientHeight,
        });
      }
    });
    observer.observe(el);

    const rangeHandler = () => {
      const range = chart.timeScale().getVisibleLogicalRange();
      mainRangeRef.current = range;
      rsiSyncRef.current?.(range);
      macdSyncRef.current?.(range);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);

    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(rangeHandler);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
      overlaysRef.current.clear();
      fitDoneRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the main series whenever the chart type changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }
    priceLineRef.current = null;
    let series: MainSeries;
    if (chartType === 'area') {
      series = chart.addAreaSeries({
        lineColor: UP,
        topColor: 'rgba(15,179,96,0.28)',
        bottomColor: 'rgba(15,179,96,0.02)',
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
    if (lastPriceRef.current > 0) {
      priceLineRef.current = series.createPriceLine({
        price: lastPriceRef.current,
        color: BLUE,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    }
  }, [chartType]);

  // Build/rebuild the overlay indicator series when the selection changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    overlaysRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        /* already removed */
      }
    });
    overlaysRef.current.clear();

    const add = (id: OverlayId, options: Parameters<IChartApi['addLineSeries']>[0]) => {
      const s = chart.addLineSeries({
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        ...options,
      });
      overlaysRef.current.set(id, s);
      return s;
    };

    if (indicators.includes('ma')) {
      add('ma20', { color: AMBER, lineWidth: 1 });
      add('ma50', { color: BLUE, lineWidth: 1 });
    }
    if (indicators.includes('bollinger')) {
      add('bbUpper', { color: 'rgba(43,140,255,0.7)', lineWidth: 1, lineStyle: LineStyle.Dashed });
      add('bbMiddle', { color: 'rgba(255,159,26,0.7)', lineWidth: 1 });
      add('bbLower', { color: 'rgba(43,140,255,0.7)', lineWidth: 1, lineStyle: LineStyle.Dashed });
    }
    if (indicators.includes('psar')) {
      add('psar', {
        color: BLUE,
        lineVisible: false,
        pointMarkersVisible: true,
        pointMarkersRadius: 2.2,
      });
    }
    if (indicators.includes('supertrend')) {
      add('supertrend', { color: UP, lineWidth: 2 });
    }
  }, [indicators]);

  // Load data whenever candles / type / overlays change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    setMainData(series, bars, chartType);
    if (bars.length) {
      lastPriceRef.current = bars[bars.length - 1].close;
      priceLineRef.current?.applyOptions({ price: lastPriceRef.current });
    }

    const closes = candles.map((c) => c.close);
    const overlays = overlaysRef.current;
    overlays.get('ma20')?.setData(toLineData(candles, sma(closes, 20)));
    overlays.get('ma50')?.setData(toLineData(candles, sma(closes, 50)));
    if (overlays.has('bbUpper')) {
      const bb = bollinger(closes, 20, 2);
      overlays.get('bbUpper')?.setData(toLineData(candles, bb.upper));
      overlays.get('bbMiddle')?.setData(toLineData(candles, bb.middle));
      overlays.get('bbLower')?.setData(toLineData(candles, bb.lower));
    }
    overlays.get('psar')?.setData(toLineData(candles, psar(candles)));
    if (overlays.has('supertrend')) {
      const st = supertrend(candles);
      const line = overlays.get('supertrend');
      line?.setData(toLineData(candles, st.line));
      const lastDir = [...st.direction].reverse().find((d) => d !== null);
      line?.applyOptions({ color: lastDir === -1 ? DOWN : UP });
    }

    if (!fitDoneRef.current && bars.length) {
      chartRef.current?.timeScale().fitContent();
      fitDoneRef.current = true;
    }
  }, [candles, bars, chartType]);

  // Live price marker + last candle update.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !price || price <= 0) return;
    lastPriceRef.current = price;
    if (!priceLineRef.current) {
      priceLineRef.current = series.createPriceLine({
        price,
        color: BLUE,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      });
    } else {
      priceLineRef.current.applyOptions({ price });
    }
  }, [price]);

  // Trade entry markers.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const markers = trades
      .filter((t) => t.symbol === symbol && t.status === 'open')
      .map((t) => ({
        time: Math.floor(new Date(t.created_at).getTime() / 1000) as UTCTimestamp,
        position: (t.direction === 'buy' ? 'belowBar' : 'aboveBar') as
          | 'belowBar'
          | 'aboveBar',
        color: t.direction === 'buy' ? UP : DOWN,
        shape: (t.direction === 'buy' ? 'arrowUp' : 'arrowDown') as
          | 'arrowUp'
          | 'arrowDown',
        text: '',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    series.setMarkers(markers);
  }, [trades, symbol]);

  // Recompute overlay pixel positions from chart coordinates.
  const layout = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const ts = chart.timeScale();
    const live = lastPriceRef.current || price;
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
  }, [trades, symbol, price]);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    layout();
  }, [layout, clock, candles, chartType, intervalSeconds, price]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return undefined;
    const ts = chart.timeScale();
    const handler = () => layoutRef.current();
    ts.subscribeVisibleLogicalRangeChange(handler);
    return () => ts.unsubscribeVisibleLogicalRangeChange(handler);
  }, []);

  // Internal 1s clock for countdowns/bubbles.
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const paneWidth = mainContainerRef.current?.clientWidth ?? 0;

  const dismissBubble = (id: number) =>
    setDismissed((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(id);
      return nextSet;
    });

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <div ref={mainContainerRef} className="h-full w-full" />

        {/* DEMO watermark */}
        <div
          className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="text-[54px] font-bold tracking-[0.3em]"
            style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.05)' }}
          >
            DEMO
          </span>
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
                        borderLeft: '1px dashed rgba(138,144,168,0.6)',
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
                          o.status === 'open' ? AMBER : lineColor
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
                        left: o.openX - 6,
                        top: o.entryY - 6,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: lineColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 8,
                        fontWeight: 700,
                      }}
                    >
                      {o.direction === 'buy' ? '↑' : '↓'}
                    </div>
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
                          boxShadow: '0 0 0 1px rgba(26,31,51,0.9)',
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
                      backgroundColor: 'var(--panel-2)',
                      border: `1px solid ${lineColor}`,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      RESULT (P/L){' '}
                      <span style={{ color: lineColor, fontWeight: 700 }}>
                        {o.profit >= 0 ? '+' : '-'}
                        {formatMoney(Math.abs(o.profit))}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Dismiss result"
                      onClick={() => dismissBubble(o.id)}
                    >
                      <X size={12} color="var(--muted)" />
                    </button>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute left-3 top-2 z-[6] text-[11px] font-semibold"
          style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Space Grotesk' }}
        >
          {symbol}
        </div>
      </div>

      {hasSubPane && (
        <div
          className="shrink-0"
          style={{
            height: subPanes > 1 ? 120 : 96,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          {indicators.includes('rsi') && (
            <div style={{ height: subPanes > 1 ? '50%' : '100%' }}>
              <MiniChart
                kind="rsi"
                candles={candles}
                register={(sync) => {
                  rsiSyncRef.current = sync;
                  if (sync && mainRangeRef.current) sync(mainRangeRef.current);
                }}
              />
            </div>
          )}
          {indicators.includes('macd') && (
            <div style={{ height: subPanes > 1 ? '50%' : '100%' }}>
              <MiniChart
                kind="macd"
                candles={candles}
                register={(sync) => {
                  macdSyncRef.current = sync;
                  if (sync && mainRangeRef.current) sync(mainRangeRef.current);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
