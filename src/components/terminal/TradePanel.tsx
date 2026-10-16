import { Minus, Plus } from 'lucide-react';
import { EXPIRIES } from '../../store/terminal';
import { formatMoney } from '../../lib/format';
import type { Direction } from '../../types/binary';

interface TradePanelProps {
  symbol: string;
  payoutPercent: number;
  stake: number;
  durationSeconds: number;
  placing: boolean;
  onOpenPair: () => void;
  onStake: (stake: number) => void;
  onDuration: (seconds: number) => void;
  onTrade: (direction: Direction) => void;
}

const QUICK_STAKES = [1, 5, 10, 50, 100];

export default function TradePanel({
  symbol,
  payoutPercent,
  stake,
  durationSeconds,
  placing,
  onOpenPair,
  onStake,
  onDuration,
  onTrade,
}: TradePanelProps) {
  const projectedPayout = stake * (1 + payoutPercent / 100);
  const projectedProfit = stake * (payoutPercent / 100);

  const clampStake = (value: number) => Math.max(1, Math.min(100000, value));

  return (
    <div
      className="shrink-0 px-3 pb-3 pt-2"
      style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
    >
      {/* Instrument + payout + expiry */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPair}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
        >
          <span className="truncate text-[13px] font-semibold" style={{ fontFamily: 'Inter', color: 'var(--text)' }}>
            {symbol}
          </span>
          <span
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ color: 'var(--profit)', backgroundColor: 'rgba(56,217,169,0.12)' }}
          >
            {Math.round(payoutPercent)}%
          </span>
        </button>
      </div>

      {/* Expiry */}
      <div className="mb-2 flex gap-1.5 overflow-x-auto">
        {EXPIRIES.map((e) => {
          const active = e.seconds === durationSeconds;
          return (
            <button
              key={e.seconds}
              type="button"
              onClick={() => onDuration(e.seconds)}
              className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                fontFamily: 'Inter',
                color: active ? 'var(--bg)' : 'var(--sub)',
                backgroundColor: active ? 'var(--gold)' : 'var(--panel2)',
                border: '1px solid var(--border)',
              }}
            >
              {e.label}
            </button>
          );
        })}
      </div>

      {/* Stake */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease stake"
          onClick={() => onStake(clampStake(stake - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
        >
          <Minus size={15} color="var(--text)" />
        </button>
        <div
          className="flex flex-1 items-center justify-center rounded-lg py-2"
          style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
        >
          <input
            type="number"
            min={1}
            value={stake}
            onChange={(e) => onStake(clampStake(Number(e.target.value) || 1))}
            className="w-20 bg-transparent text-center text-[16px] font-semibold outline-none"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}
          />
        </div>
        <button
          type="button"
          aria-label="Increase stake"
          onClick={() => onStake(clampStake(stake + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
        >
          <Plus size={15} color="var(--text)" />
        </button>
      </div>

      <div className="mb-2 flex gap-1.5">
        {QUICK_STAKES.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onStake(amount)}
            className="flex-1 rounded-md py-1 text-[11px] font-medium"
            style={{
              fontFamily: 'Inter',
              color: stake === amount ? 'var(--bg)' : 'var(--sub)',
              backgroundColor: stake === amount ? 'var(--gold)' : 'var(--panel2)',
              border: '1px solid var(--border)',
            }}
          >
            {amount}
          </button>
        ))}
      </div>

      {/* Projected payout */}
      <div
        className="mb-2 flex items-center justify-between rounded-lg px-3 py-1.5 text-[12px]"
        style={{ backgroundColor: 'var(--panel2)' }}
      >
        <span style={{ color: 'var(--sub)' }}>Payout</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
          {formatMoney(projectedPayout)}{' '}
          <span style={{ color: 'var(--profit)' }}>+{formatMoney(projectedProfit)}</span>
        </span>
      </div>

      {/* Buy / Sell */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={placing}
          onClick={() => onTrade('buy')}
          className="flex-1 rounded-xl py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--profit)', fontFamily: 'Inter' }}
        >
          Buy {Math.round(payoutPercent)}%
        </button>
        <button
          type="button"
          disabled={placing}
          onClick={() => onTrade('sell')}
          className="flex-1 rounded-xl py-3 text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--loss)', fontFamily: 'Inter' }}
        >
          Sell {Math.round(payoutPercent)}%
        </button>
      </div>
    </div>
  );
}
