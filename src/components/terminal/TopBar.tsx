import { Bell, ChevronDown, GraduationCap, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/format';

interface TopBarProps {
  balance: number;
  unreadCount: number;
  onAccount: () => void;
  onBell: () => void;
  onDeposit: () => void;
}

export default function TopBar({
  balance,
  unreadCount,
  onAccount,
  onBell,
  onDeposit,
}: TopBarProps) {
  return (
    <header
      className="kt-safe-top sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 py-2"
      style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={onAccount}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-2.5 py-1.5 text-left"
        style={{ backgroundColor: 'var(--panel-2)' }}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--blue)' }}
        >
          <GraduationCap size={14} color="#fff" />
        </span>
        <span
          className="shrink-0 text-[10px] font-bold uppercase"
          style={{ color: 'var(--amber)' }}
        >
          Demo
        </span>
        <span
          className="mono truncate text-[14px] font-semibold"
          style={{ color: 'var(--text)' }}
        >
          {formatMoney(balance)}
        </span>
        <ChevronDown size={14} color="var(--muted)" className="shrink-0" />
      </button>

      <button
        type="button"
        onClick={onBell}
        aria-label="Notifications"
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--panel-2)' }}
      >
        <Bell size={17} color="var(--text)" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ backgroundColor: 'var(--red)' }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onDeposit}
        className="flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[12px] font-bold text-white"
        style={{ backgroundColor: 'var(--green)' }}
      >
        <Plus size={13} /> Deposit
      </button>
    </header>
  );
}
