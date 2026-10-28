import { useState } from 'react';
import {
  Briefcase,
  CandlestickChart,
  MoreHorizontal,
  PenLine,
  Settings,
  Sliders,
} from 'lucide-react';
import {
  CHART_TYPES,
  TIMEFRAMES,
  type Timeframe,
} from '../../store/terminal';
import type { ChartType, IndicatorKey } from '../../types/binary';
import DrawingsSheet, { type DrawingKey } from './DrawingsSheet';
import IndicatorsSheet from './IndicatorsSheet';

interface ChartToolbarProps {
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartType: (type: ChartType) => void;
  indicators: IndicatorKey[];
  onToggleIndicator: (key: IndicatorKey) => void;
  onClearIndicators: () => void;
  drawings: DrawingKey[];
  onToggleDrawing: (key: DrawingKey) => void;
  onClearDrawings: () => void;
  openTradeCount: number;
  onOpenTrades: () => void;
  onOpenSettings?: () => void;
}

type Popup = 'none' | 'timeframe' | 'chartType';

function ToolButton({
  active,
  label,
  badge,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg shadow-lg"
      style={{
        backgroundColor: active ? 'var(--blue)' : 'var(--panel)',
        border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
          style={{ backgroundColor: 'var(--red)' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export default function ChartToolbar({
  timeframe,
  onTimeframe,
  chartType,
  onChartType,
  indicators,
  onToggleIndicator,
  onClearIndicators,
  drawings,
  onToggleDrawing,
  onClearDrawings,
  openTradeCount,
  onOpenTrades,
  onOpenSettings,
}: ChartToolbarProps) {
  const [popup, setPopup] = useState<Popup>('none');
  const [drawingsOpen, setDrawingsOpen] = useState(false);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);

  return (
    <>
      {/* Outside-tap catcher */}
      {popup !== 'none' && (
        <div
          className="fixed inset-0 z-[30]"
          onClick={() => setPopup('none')}
          aria-hidden="true"
        />
      )}

      <div className="absolute left-2 top-2 z-[31] flex flex-col gap-1.5">
        <ToolButton label="Timeframes" onClick={() => setPopup((p) => (p === 'timeframe' ? 'none' : 'timeframe'))}>
          <MoreHorizontal size={17} color={popup === 'timeframe' ? '#fff' : 'var(--text)'} />
        </ToolButton>

        <ToolButton label="Drawings" onClick={() => setDrawingsOpen(true)}>
          <PenLine size={16} color="var(--text)" />
        </ToolButton>

        <button
          type="button"
          onClick={() => setPopup((p) => (p === 'timeframe' ? 'none' : 'timeframe'))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold shadow-lg"
          style={{
            backgroundColor: popup === 'timeframe' ? 'var(--blue)' : 'var(--panel)',
            border: `1px solid ${popup === 'timeframe' ? 'var(--blue)' : 'var(--border)'}`,
            color: popup === 'timeframe' ? '#fff' : 'var(--text)',
          }}
          aria-label="Timeframe"
        >
          {timeframe.label}
        </button>

        <ToolButton label="Chart type" active={popup === 'chartType'} onClick={() => setPopup((p) => (p === 'chartType' ? 'none' : 'chartType'))}>
          <CandlestickChart size={16} color={popup === 'chartType' ? '#fff' : 'var(--text)'} />
        </ToolButton>

        <ToolButton label="Indicators" active={indicatorsOpen} onClick={() => setIndicatorsOpen(true)}>
          <Sliders size={16} color={indicatorsOpen ? '#fff' : 'var(--text)'} />
        </ToolButton>

        <ToolButton label="Trades" badge={openTradeCount} onClick={onOpenTrades}>
          <Briefcase size={16} color="var(--text)" />
        </ToolButton>

        {onOpenSettings && (
          <ToolButton label="Settings" onClick={onOpenSettings}>
            <Settings size={16} color="var(--text)" />
          </ToolButton>
        )}
      </div>

      {popup === 'timeframe' && (
        <div
          className="kt-fade absolute left-[52px] top-2 z-[32] w-[228px] rounded-2xl p-3 shadow-2xl"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Timeframe
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {TIMEFRAMES.map((tf) => {
              const active = tf.key === timeframe.key;
              return (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => {
                    onTimeframe(tf);
                    setPopup('none');
                  }}
                  className="rounded-lg py-2 text-[12px] font-semibold"
                  style={{
                    backgroundColor: active ? 'var(--blue)' : 'var(--panel-2)',
                    color: active ? '#fff' : 'var(--text)',
                  }}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {popup === 'chartType' && (
        <div
          className="kt-fade absolute left-[52px] top-[132px] z-[32] w-40 rounded-2xl p-2 shadow-2xl"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          {CHART_TYPES.map((c) => {
            const active = c.key === chartType;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  onChartType(c.key);
                  setPopup('none');
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium"
                style={{
                  backgroundColor: active ? 'var(--panel-2)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <DrawingsSheet
        open={drawingsOpen}
        onClose={() => setDrawingsOpen(false)}
        active={drawings}
        onToggle={onToggleDrawing}
        onClear={onClearDrawings}
      />
      <IndicatorsSheet
        open={indicatorsOpen}
        onClose={() => setIndicatorsOpen(false)}
        active={indicators}
        onToggle={onToggleIndicator}
        onClear={onClearIndicators}
      />
    </>
  );
}
