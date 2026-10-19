import { useMemo, useState } from 'react';
import { Briefcase, Inbox } from 'lucide-react';
import Sheet from './Sheet';
import { formatCountdown, formatMoney } from '../../lib/format';
import type { Trade } from '../../types/binary';

interface TradesSheetProps {
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
  return d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })
    .toUpperCase();
}

function durationLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

function Flag() {
  return (
    <span className="relative h-6 w-8 shrink-0">
      <span className="absolute left-0 top-0 h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
      <span className="absolute left-2.5 top-0 h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--amber)' }} />
    </span>
  );
}

export default function TradesSheet({ open, onClose, trades, now }: TradesSheetProps) {
  const [tab, setTab] = useState<TabKey>('trades');

  const openTrades = trades.filter((t) => t.status === 'open');
  const closedTrades = trades.filter((t) => t.status !== 'open');

  const groups = useMemo(() => {
    const sorted = trades
      .slice()
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

  const secondsLeft = (t: Trade) =>
    Math.max(0, (new Date(t.expiry_time).getTime() - now) / 1000);

  return (
    <Sheet open={open} onClose={onClose} title="My trades" variant="bottom">
      <div className="flex gap-2 px-4 py-2">
        {(
          [
            ['trades', 'Trades', trades.length],
            ['pending', 'Pending', 0],
          ] as [TabKey, string, number][]
        ).map(([key, label, count]) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{
                backgroundColor: active ? 'var(--blue)' : 'var(--panel-2)',
                color: active ? '#fff' : 'var(--muted)',
              }}
            >
              {label}
              <span
                className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px]"
                style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'var(--panel)' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'trades' && (
        <div>
          {groups.length === 0 && (
            <div className="p-8 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              No trades yet.
            </div>
          )}
          {groups.map((rows, idx) => (
            <div key={idx}>
              <div
                className="flex items-center justify-between px-4 py-1.5"
                style={{ backgroundColor: 'var(--panel-2)' }}
              >
                <span className="text-[11px] font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
                  {dayLabel(rows[0].created_at)}
                </span>
                <span
                  className="flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ backgroundColor: 'var(--panel)', color: 'var(--text)' }}
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
                const lost = t.status === 'lost';
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <Flag />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                        {t.instrument_name || t.symbol}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                        Stake {formatMoney(parseFloat(t.stake))} ·{' '}
                        <span style={{ color: t.direction === 'buy' ? 'var(--green)' : 'var(--red)' }}>
                          {t.direction.toUpperCase()}
                        </span>
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>
                        {isOpen ? formatCountdown(secondsLeft(t)) : durationLabel(duration)}
                      </div>
                      <div
                        className="mono text-[13px] font-bold"
                        style={{ color: isOpen ? 'var(--green)' : profit > 0 ? 'var(--green)' : 'var(--red)' }}
                      >
                        {isOpen
                          ? `+${formatMoney(t.potential_profit)}`
                          : `${profit > 0 ? '+' : ''}${formatMoney(profit)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'pending' && (
        <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--panel-2)' }}
          >
            <Inbox size={26} color="var(--muted)" />
          </span>
          <p className="max-w-[240px] text-[13px]" style={{ color: 'var(--muted)' }}>
            Order list is empty. Create a pending trade using the form above.
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 py-3" style={{ color: 'var(--faint)' }}>
        <Briefcase size={12} />
        <span className="text-[10px]">
          {openTrades.length} open · {closedTrades.length} closed
        </span>
      </div>
    </Sheet>
  );
}
