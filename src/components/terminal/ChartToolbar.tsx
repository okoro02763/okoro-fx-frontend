import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  CHART_TYPES,
  TIMEFRAMES,
  type Timeframe,
} from '../../store/terminal';
import type { ChartType } from '../../types/binary';

interface ChartToolbarProps {
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartType: (type: ChartType) => void;
}

export default function ChartToolbar({
  timeframe,
  onTimeframe,
  chartType,
  onChartType,
}: ChartToolbarProps) {
  const [typeOpen, setTypeOpen] = useState(false);

  return (
    <div
      className="flex items-center gap-1 overflow-x-auto px-2 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {TIMEFRAMES.map((tf) => {
        const active = tf.key === timeframe.key;
        return (
          <button
            key={tf.key}
            type="button"
            onClick={() => onTimeframe(tf)}
            className="shrink-0 rounded px-2.5 py-1 text-[12px] font-medium transition-colors"
            style={{
              fontFamily: 'Inter',
              color: active ? 'var(--bg)' : 'var(--sub)',
              backgroundColor: active ? 'var(--gold)' : 'transparent',
            }}
          >
            {tf.label}
          </button>
        );
      })}

      <div className="relative ml-auto shrink-0">
        <button
          type="button"
          onClick={() => setTypeOpen((v) => !v)}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium"
          style={{
            fontFamily: 'Inter',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          {CHART_TYPES.find((c) => c.key === chartType)?.label ?? 'Chart'}
          <ChevronDown size={13} />
        </button>
        {typeOpen && (
          <div
            className="absolute right-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
          >
            {CHART_TYPES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  onChartType(c.key);
                  setTypeOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[12px]"
                style={{
                  fontFamily: 'Inter',
                  color: c.key === chartType ? 'var(--gold)' : 'var(--text)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
