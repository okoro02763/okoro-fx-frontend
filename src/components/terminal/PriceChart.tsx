import { useEffect, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, ChartType, Quote } from '../../types/binary';

const UP = '#38D9A9';
const DOWN = '#FF6B6B';
const GRID = 'rgba(39, 44, 71, 0.5)';
const BORDER = '#272C47';
const TEXT = '#868CA8';

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

export default function PriceChart({
  symbol,
  candles,
  chartType,
  intervalSeconds,
  tick,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<AnySeries | null>(null);
  const barsRef = useRef<Candle[]>([]);
  const haPrevRef = useRef<Candle | null>(null);
  const haCurrentRef = useRef<Candle | null>(null);
  const intervalRef = useRef(intervalSeconds);
  const typeRef = useRef(chartType);

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
  }, [chartType]);

  // Load data when candles/type/interval change.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    intervalRef.current = intervalSeconds;
    barsRef.current = candles.slice();
    const bars = chartType === 'heikin-ashi' ? toHeikinAshi(candles) : candles;
    haPrevRef.current = bars.length >= 2 ? bars[bars.length - 2] : null;
    haCurrentRef.current = bars.length >= 1 ? bars[bars.length - 1] : null;
    setSeriesData(series, bars, chartType);
    chartRef.current?.timeScale().fitContent();
  }, [candles, chartType, intervalSeconds]);

  // Merge each live tick into the newest candle.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !tick || !tick.price || tick.price <= 0) return;

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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        className="pointer-events-none absolute left-3 top-2 z-10 text-[11px] font-medium"
        style={{ color: 'rgba(134,140,168,0.55)', fontFamily: 'Space Grotesk' }}
      >
        {symbol}
      </div>
    </div>
  );
}
