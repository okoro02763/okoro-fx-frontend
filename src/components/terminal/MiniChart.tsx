import { useEffect, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle } from '../../types/binary';
import { macd, rsi } from '../../lib/indicators';

const BG = '#1a1f33';
const GRID = 'rgba(54, 60, 88, 0.35)';
const BORDER = '#363c58';
const TEXT = '#8a90a8';
const UP = '#0fb360';
const DOWN = '#ef5a4c';
const BLUE = '#2b8cff';
const AMBER = '#ff9f1a';

export type LogicalRange = { from: number; to: number } | null;

interface MiniChartProps {
  kind: 'rsi' | 'macd';
  candles: Candle[];
  register?: (sync: ((range: LogicalRange) => void) | null) => void;
  onRange?: (range: LogicalRange) => void;
}

interface SeriesBundle {
  line?: ISeriesApi<'Line'>;
  macdLine?: ISeriesApi<'Line'>;
  signalLine?: ISeriesApi<'Line'>;
  histogram?: ISeriesApi<'Histogram'>;
}

function lineData(
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

export default function MiniChart({
  kind,
  candles,
  register,
  onRange,
}: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const bundleRef = useRef<SeriesBundle>({});
  const syncGuard = useRef(false);
  const registerRef = useRef(register);
  const onRangeRef = useRef(onRange);
  registerRef.current = register;
  onRangeRef.current = onRange;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: BG },
        textColor: TEXT,
        fontFamily: 'Inter, sans-serif',
        fontSize: 9,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: 'rgba(0,0,0,0)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: BORDER,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { borderColor: BORDER, timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const bundle: SeriesBundle = {};
    if (kind === 'rsi') {
      const line = chart.addLineSeries({
        color: AMBER,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      [30, 70].forEach((level) => {
        line.createPriceLine({
          price: level,
          color: 'rgba(138,144,168,0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false,
          title: '',
        });
      });
      bundle.line = line;
    } else {
      bundle.macdLine = chart.addLineSeries({
        color: BLUE,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bundle.signalLine = chart.addLineSeries({
        color: '#c8cde0',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bundle.histogram = chart.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
      });
    }
    bundleRef.current = bundle;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(el);

    const handler = () => {
      if (syncGuard.current) {
        syncGuard.current = false;
        return;
      }
      onRangeRef.current?.(chart.timeScale().getVisibleLogicalRange());
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handler);

    registerRef.current?.((range) => {
      if (!range) return;
      syncGuard.current = true;
      chart.timeScale().setVisibleLogicalRange(range);
    });

    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
      registerRef.current?.(null);
      bundleRef.current = {};
      chart.remove();
      chartRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle.line && !bundle.macdLine) return;
    const closes = candles.map((c) => c.close);

    if (kind === 'rsi' && bundle.line) {
      bundle.line.setData(lineData(candles, rsi(closes, 14)));
    } else if (kind === 'macd' && bundle.macdLine && bundle.signalLine && bundle.histogram) {
      const { macd: m, signal, histogram } = macd(closes, 12, 26, 9);
      bundle.macdLine.setData(lineData(candles, m));
      bundle.signalLine.setData(lineData(candles, signal));
      const histData: HistogramData[] = [];
      histogram.forEach((v, i) => {
        if (v === null || !candles[i]) return;
        histData.push({
          time: candles[i].time as UTCTimestamp,
          value: v,
          color: v >= 0 ? UP : DOWN,
        });
      });
      bundle.histogram.setData(histData);
    }
  }, [candles, kind]);

  return <div ref={containerRef} className="h-full w-full" />;
}
