import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Minus, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import type { Direction } from '../../types/binary';
import type { StakeMode } from '../../store/terminal';

interface TradePanelProps {
  symbol: string;
  instrumentName?: string;
  payoutPercent: number;
  balance: number;
  durationSeconds: number;
  onDuration: (seconds: number) => void;
  stakeMode: StakeMode;
  stakeValue: number;
  onStakeMode: (mode: StakeMode) => void;
  onStakeValue: (value: number) => void;
  pendingTrade: boolean;
  onPendingTrade: (pending: boolean) => void;
  placing: boolean;
  onOpenPair: () => void;
  onTrade: (direction: Direction) => void;
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked ? 'var(--blue)' : 'var(--panel-2)', border: '1px solid var(--border)' }}
    >
      <span
        className="absolute top-[2px] h-[16px] w-[16px] rounded-full transition-all"
        style={{ left: checked ? '20px' : '2px', backgroundColor: '#fff' }}
      />
    </button>
  );
}

function dotted() {
  return (
    <span
      className="mx-2 flex-1 self-end"
      style={{ borderBottom: '1px dotted var(--faint)', marginBottom: 3 }}
    />
  );
}

export default function TradePanel({
  symbol,
  instrumentName,
  payoutPercent,
  balance,
  durationSeconds,
  onDuration,
  stakeMode,
  stakeValue,
  onStakeMode,
  onStakeValue,
  pendingTrade,
  onPendingTrade,
  placing,
  onOpenPair,
  onTrade,
}: TradePanelProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stake =
    stakeMode === 'percent' ? (balance * stakeValue) / 100 : stakeValue;
  const payout = stake * (1 + payoutPercent / 100);
  const overBalance = stake > balance;
  const disabled = placing || overBalance || stake <= 0;

  const expiry = new Date(now + durationSeconds * 1000);
  const expiryClock = `${expiry.getHours().toString().padStart(2, '0')}:${expiry
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const onTimeChange = (value: string) => {
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    let seconds = Math.round((target.getTime() - Date.now()) / 1000);
    if (seconds <= 0) seconds += 24 * 3600;
    onDuration(seconds);
  };

  const clamp = (v: number) => Math.max(stakeMode === 'percent' ? 0 : 1, Math.min(100000, v));
  const step = stakeValue >= 100 ? 10 : 1;
  const labels = ['Buy', 'Sell'] as const;

  return (
    <div
      className="shrink-0 px-3 pb-3 pt-2"
      style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
    >
      {/* Row 1: instrument + payout + pending toggle */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPair}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <span className="relative h-6 w-8 shrink-0">
            <span
              className="absolute left-0 top-0 h-6 w-6 rounded-full"
              style={{ backgroundColor: 'var(--blue)' }}
            />
            <span
              className="absolute left-2.5 top-0 h-6 w-6 rounded-full"
              style={{ backgroundColor: 'var(--amber)' }}
            />
          </span>
          <span className="min-w-0">
            <span
              className="block truncate text-[13px] font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {instrumentName || symbol}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--amber)' }}>
              Payout {Math.round(payoutPercent)}%
            </span>
          </span>
          <ChevronRight size={16} color="var(--muted)" />
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>
            Pending trade
          </span>
          <Switch checked={pendingTrade} onChange={onPendingTrade} />
        </div>
      </div>

      {/* Row 2: Time + Investment */}
      <div className="mb-2 flex gap-2">
        <label
          className="relative flex flex-1 flex-col rounded-xl px-3 pb-1.5 pt-4"
          style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
        >
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Time
          </span>
          <input
            type="time"
            value={expiryClock}
            step={60}
            onChange={(e) => onTimeChange(e.target.value)}
            className="mono w-full bg-transparent text-[15px] font-semibold outline-none"
            style={{ color: 'var(--text)' }}
          />
        </label>

        <div
          className="relative flex flex-1 items-center gap-1 rounded-xl px-2 pb-1.5 pt-4"
          style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
        >
          <span
            className="absolute left-3 top-1.5 text-[10px] uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            Investment
          </span>
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => onStakeValue(clamp(stakeValue - step))}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--panel)' }}
          >
            <Minus size={13} color="var(--text)" />
          </button>
          <span className="mono flex flex-1 items-center justify-center text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
            {stakeMode === 'percent' ? (
              <>
                <input
                  value={stakeValue}
                  inputMode="decimal"
                  onChange={(e) => onStakeValue(clamp(Number(e.target.value) || 0))}
                  className="mono w-10 bg-transparent text-center text-[15px] font-semibold outline-none"
                  style={{ color: 'var(--text)' }}
                />
                %
              </>
            ) : (
              formatMoney(stakeValue)
            )}
          </span>
          <button
            type="button"
            aria-label="Increase"
            onClick={() => onStakeValue(clamp(stakeValue + step))}
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--panel)' }}
          >
            <Plus size={13} color="var(--text)" />
          </button>
          <button
            type="button"
            onClick={() => {
              onStakeMode(stakeMode === 'percent' ? 'amount' : 'percent');
              onStakeValue(stakeMode === 'percent' ? Math.round(stake) || 10 : 10);
            }}
            className="absolute -bottom-0 right-1 text-[9px] font-bold uppercase"
            style={{ color: 'var(--blue)' }}
          >
            Switch
          </button>
        </div>
      </div>

      {/* Summary rows */}
      <div className="mb-2 px-1 text-[12px]">
        <div className="flex items-center">
          <span style={{ color: 'var(--muted)' }}>Payout</span>
          {dotted()}
          <span className="mono font-bold" style={{ color: 'var(--text)' }}>
            {formatMoney(payout)}
          </span>
        </div>
        <div className="mt-1 flex items-center">
          <span style={{ color: 'var(--muted)' }}>Investment</span>
          {dotted()}
          <span className="mono" style={{ color: 'var(--muted)' }}>
            {formatMoney(stake)}
          </span>
        </div>
      </div>

      {overBalance && (
        <p className="mb-1.5 text-center text-[11px]" style={{ color: 'var(--red)' }}>
          Stake exceeds your demo balance.
        </p>
      )}

      {/* Buy / Sell */}
      <div className="flex gap-2">
        {(['buy', 'sell'] as const).map((dir, i) => {
          const isBuy = dir === 'buy';
          return (
            <button
              key={dir}
              type="button"
              disabled={disabled}
              onClick={() => onTrade(dir)}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: isBuy ? 'var(--green)' : 'var(--red)',
                borderRadius: 12,
              }}
            >
              {isBuy ? (
                <ArrowUpCircle size={22} color="#fff" />
              ) : (
                <ArrowDownCircle size={22} color="#fff" />
              )}
              {labels[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
