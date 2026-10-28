import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Minus, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/format';
import { useSettings } from '../../store/settings';
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

const PRESET_TIMES = ['08:36', '08:37', '08:38', '08:39', '08:40', '08:45', '09:00', '09:30', '10:00'];

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
  const [timePopupOpen, setTimePopupOpen] = useState(false);
  const [timeTab, setTimeTab] = useState<'timer' | 'time'>('timer');
  const [manualTime, setManualTime] = useState('');
  const { timezoneMinutes } = useSettings();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stake =
    stakeMode === 'percent' ? (balance * stakeValue) / 100 : stakeValue;
  const payout = stake * (1 + payoutPercent / 100);
  const overBalance = stake > balance;
  const disabled = placing || overBalance || stake <= 0;

  const expiryMs = now + durationSeconds * 1000;
  const expiryShifted = new Date(expiryMs + timezoneMinutes * 60_000);
  const expiryClock = `${expiryShifted.getUTCHours().toString().padStart(2, '0')}:${expiryShifted
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`;

  const applyTimeString = (value: string) => {
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    let seconds = Math.round((target.getTime() - Date.now()) / 1000);
    if (seconds <= 0) seconds += 24 * 3600;
    onDuration(seconds);
    setTimePopupOpen(false);
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
              style={{ color: '#ffffff' }}
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
        <button
          type="button"
          onClick={() => setTimePopupOpen(true)}
          className="relative flex flex-1 flex-col rounded-xl px-3 pb-1.5 pt-4 text-left"
          style={{ backgroundColor: 'var(--panel-2)', border: '1px solid var(--border)' }}
        >
          <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Time
          </span>
          <span className="mono w-full text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
            {expiryClock}
          </span>
        </button>

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
              <input
                value={Math.round(stakeValue)}
                inputMode="decimal"
                onChange={(e) => onStakeValue(clamp(Number(e.target.value) || 0))}
                className="mono w-16 bg-transparent text-center text-[15px] font-semibold outline-none"
                style={{ color: 'var(--text)' }}
              />
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
              if (stakeMode === 'percent') {
                onStakeMode('amount');
                onStakeValue(Math.max(1, Math.round(stake)));
              } else {
                onStakeMode('percent');
                onStakeValue(10);
              }
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

      {timePopupOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/60"
            onClick={() => setTimePopupOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[91] mx-auto max-w-md rounded-t-3xl p-4"
            style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>Set time</span>
              <button type="button" onClick={() => setTimePopupOpen(false)}>
                <span style={{ color: 'var(--muted)' }}>✕</span>
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              {(['timer', 'time'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTimeTab(tab)}
                  className="flex-1 rounded-full py-1.5 text-[12px] font-semibold uppercase"
                  style={{
                    backgroundColor: timeTab === tab ? 'var(--blue)' : 'var(--panel-2)',
                    color: timeTab === tab ? '#fff' : 'var(--muted)',
                  }}
                >
                  {tab === 'timer' ? 'Timer' : 'Time'}
                </button>
              ))}
            </div>
            {timeTab === 'time' && (
              <>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {PRESET_TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyTimeString(t)}
                      className="rounded-lg py-2 text-[13px] font-semibold"
                      style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (manualTime) applyTimeString(manualTime);
                  }}
                  className="mb-2 w-full rounded-lg py-2 text-[13px] font-semibold"
                  style={{ backgroundColor: 'var(--blue)', color: '#fff' }}
                >
                  Set manually
                </button>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px]"
                  style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                />
              </>
            )}
            {timeTab === 'timer' && (
              <div className="py-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
                Timer mode coming soon
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
