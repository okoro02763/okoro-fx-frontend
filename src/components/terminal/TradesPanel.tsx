import { useState } from 'react';
import { formatCountdown, formatMoney } from '../../lib/format';
import type { Trade, TradeStatus } from '../../types/binary';

interface TradesPanelProps {
  trades: Trade[];
  now: number;
  loading: boolean;
}

type TabKey = 'open' | 'closed';

function resultLabel(status: TradeStatus): string {
  switch (status) {
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
    case 'refund':
      return 'Refund';
    default:
      return 'Open';
  }
}

function resultColor(status: TradeStatus): string {
  if (status === 'won') return 'var(--profit)';
  if (status === 'lost') return 'var(--loss)';
  return 'var(--sub)';
}

export default function TradesPanel({ trades, now, loading }: TradesPanelProps) {
  const [tab, setTab] = useState<TabKey>('open');
  const open = trades.filter((t) => t.status === 'open');
  const closed = trades.filter((t) => t.status !== 'open');
  const rows = tab === 'open' ? open : closed;

  const secondsLeft = (t: Trade) =>
    Math.max(0, (new Date(t.expiry_time).getTime() - now) / 1000);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 gap-1 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {(['open', 'closed'] as TabKey[]).map((key) => {
          const active = key === tab;
          const count = key === 'open' ? open.length : closed.length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="rounded-full px-3 py-1 text-[12px] font-semibold capitalize"
              style={{
                fontFamily: 'Inter',
                color: active ? 'var(--bg)' : 'var(--sub)',
                backgroundColor: active ? 'var(--gold)' : 'var(--panel2)',
              }}
            >
              {key} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && trades.length === 0 && (
          <div className="p-6 text-center text-[13px]" style={{ color: 'var(--sub)' }}>
            Loading trades…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="p-6 text-center text-[13px]" style={{ color: 'var(--sub)' }}>
            No {tab} trades yet.
          </div>
        )}
        {rows.map((t) => {
          const profit = parseFloat(t.profit);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    t.direction === 'buy' ? 'var(--profit)' : 'var(--loss)',
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate text-[13px] font-semibold"
                    style={{ fontFamily: 'Inter', color: 'var(--text)' }}
                  >
                    {t.symbol}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      color: t.direction === 'buy' ? 'var(--profit)' : 'var(--loss)',
                      backgroundColor:
                        t.direction === 'buy'
                          ? 'rgba(56,217,169,0.12)'
                          : 'rgba(255,107,107,0.12)',
                    }}
                  >
                    {t.direction}
                  </span>
                </div>
                <span className="text-[11px]" style={{ color: 'var(--sub)' }}>
                  Stake {formatMoney(parseFloat(t.stake))}
                </span>
              </div>

              {t.status === 'open' ? (
                <div className="shrink-0 text-right">
                  <div
                    className="text-[14px] font-semibold tabular-nums"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--gold)' }}
                  >
                    {formatCountdown(secondsLeft(t))}
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--sub)' }}>
                    +{formatMoney(t.potential_profit)}
                  </div>
                </div>
              ) : (
                <div className="shrink-0 text-right">
                  <div
                    className="text-[12px] font-bold"
                    style={{ fontFamily: 'Inter', color: resultColor(t.status) }}
                  >
                    {resultLabel(t.status)}
                  </div>
                  <div
                    className="text-[12px] font-semibold tabular-nums"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      color: profit >= 0 ? 'var(--profit)' : 'var(--loss)',
                    }}
                  >
                    {profit >= 0 ? '+' : ''}
                    {formatMoney(profit)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
