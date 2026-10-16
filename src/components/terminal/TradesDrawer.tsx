import { useMemo, useState } from 'react';
import { Briefcase, X } from 'lucide-react';
import { formatCountdown, formatMoney } from '../../lib/format';
import type { Trade } from '../../types/binary';

interface TradesDrawerProps {
  open: boolean;
  onClose: () => void;
  trades: Trade[];
  now: number;
}

type TabKey = 'trades' | 'pending';

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function durationLabel(seconds: number): string {
  if (seconds % 3600 === 0 && seconds >= 3600) {
    return `${seconds / 3600} h`;
  }
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

export default function TradesDrawer({
  open,
  onClose,
  trades,
  now,
}: TradesDrawerProps) {
  const [tab, setTab] = useState<TabKey>('trades');

  const groups = useMemo(() => {
    const sorted = trades
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    const map = new Map<string, Trade[]>();
    sorted.forEach((t) => {
      const key = dayKey(t.created_at);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    });
    return Array.from(map.values());
  }, [trades]);

  if (!open) return null;

  const secondsLeft = (t: Trade) =>
    Math.max(0, (new Date(t.expiry_time).getTime() - now) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:h-[70vh] sm:rounded-2xl"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="flex items-center gap-2">
            <Briefcase size={16} color="var(--gold)" />
            <h2
              className="text-[15px] font-semibold"
              style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}
            >
              My trades
            </h2>
          </span>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} color="var(--sub)" />
          </button>
        </div>

        <div
          className="flex gap-1 px-3 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {(
            [
              ['trades', 'Trades'],
              ['pending', 'Pending'],
            ] as [TabKey, string][]
          ).map(([key, label]) => {
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className="rounded-full px-3 py-1 text-[12px] font-semibold"
                style={{
                  fontFamily: 'Inter',
                  color: active ? 'var(--bg)' : 'var(--sub)',
                  backgroundColor: active ? 'var(--gold)' : 'var(--panel2)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'trades' && groups.length === 0 && (
            <div
              className="p-8 text-center text-[13px]"
              style={{ color: 'var(--sub)', fontFamily: 'Inter' }}
            >
              No trades yet.
            </div>
          )}

          {tab === 'trades' &&
            groups.map((rows, idx) => (
              <div key={idx}>
                <div
                  className="flex items-center justify-between px-4 py-1.5"
                  style={{ backgroundColor: 'var(--panel2)' }}
                >
                  <span
                    className="text-[11px] font-semibold"
                    style={{ fontFamily: 'Inter', color: 'var(--sub)' }}
                  >
                    {dayLabel(rows[0].created_at)}
                  </span>
                  <span
                    className="rounded-full px-1.5 text-[10px] font-bold"
                    style={{
                      color: 'var(--gold)',
                      backgroundColor: 'rgba(232,180,84,0.15)',
                    }}
                  >
                    {rows.length}
                  </span>
                </div>
                {rows.map((t) => {
                  const created = new Date(t.created_at).getTime();
                  const expiry = new Date(t.expiry_time).getTime();
                  const duration = Math.max(0, Math.round((expiry - created) / 1000));
                  const profit = parseFloat(t.profit);
                  const isOpen = t.status === 'open';
                  const gold = isOpen;
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
                              color:
                                t.direction === 'buy'
                                  ? 'var(--profit)'
                                  : 'var(--loss)',
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
                      <div className="shrink-0 text-right">
                        <div
                          className="text-[13px] font-semibold tabular-nums"
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            color: gold ? 'var(--gold)' : 'var(--sub)',
                          }}
                        >
                          {isOpen
                            ? formatCountdown(secondsLeft(t))
                            : durationLabel(duration)}
                        </div>
                        <div
                          className="text-[12px] font-semibold tabular-nums"
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            color: isOpen
                              ? 'var(--profit)'
                              : profit >= 0
                              ? 'var(--profit)'
                              : 'var(--loss)',
                          }}
                        >
                          {isOpen
                            ? `+${formatMoney(t.potential_profit)}`
                            : `${profit >= 0 ? '+' : ''}${formatMoney(profit)}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          {tab === 'pending' && (
            <div
              className="p-8 text-center text-[13px]"
              style={{ color: 'var(--sub)', fontFamily: 'Inter' }}
            >
              Order list is empty. Create a pending trade using the form above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
