import { Activity, ChevronRight, LineChart, Sliders, TrendingUp, Waves } from 'lucide-react';
import Sheet from './Sheet';
import type { IndicatorKey } from '../../types/binary';

export const INDICATOR_TOOLS: {
  key: IndicatorKey;
  label: string;
  icon: typeof Activity;
}[] = [
  { key: 'ma', label: 'Moving Average', icon: LineChart },
  { key: 'bollinger', label: 'Bollinger Bands', icon: Waves },
  { key: 'rsi', label: 'RSI', icon: Activity },
  { key: 'macd', label: 'MACD', icon: Sliders },
  { key: 'psar', label: 'Parabolic SAR', icon: TrendingUp },
  { key: 'supertrend', label: 'Supertrend', icon: TrendingUp },
];

interface IndicatorsSheetProps {
  open: boolean;
  onClose: () => void;
  active: IndicatorKey[];
  onToggle: (key: IndicatorKey) => void;
  onClear: () => void;
}

export default function IndicatorsSheet({
  open,
  onClose,
  active,
  onToggle,
  onClear,
}: IndicatorsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Indicators" variant="bottom">
      <div className="p-3">
        {INDICATOR_TOOLS.map(({ key, label, icon: Icon }) => {
          const selected = active.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className="mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
              style={{ backgroundColor: 'var(--panel-2)' }}
            >
              <Icon size={17} color={selected ? 'var(--blue)' : 'var(--muted)'} />
              <span
                className="flex-1 text-[13px] font-medium"
                style={{ color: selected ? 'var(--blue)' : 'var(--text)' }}
              >
                {label}
              </span>
              <ChevronRight size={16} color="var(--muted)" />
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-xl py-3 text-[13px] font-bold"
          style={{ backgroundColor: 'var(--panel-2)', color: 'var(--red)' }}
        >
          Delete all
        </button>
      </div>
    </Sheet>
  );
}
