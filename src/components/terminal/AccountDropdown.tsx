import { ChevronDown, RefreshCw } from 'lucide-react';
import type { User } from '../../api/auth';
import { formatMoney } from '../../lib/format';

interface AccountDropdownProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  balance: number;
  onReset: () => void;
  onExchange: () => void;
}

export default function AccountDropdown({
  open,
  onClose,
  user,
  balance,
  onReset,
  onExchange,
}: AccountDropdownProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className="kt-sheet absolute left-3 right-3 top-14 rounded-2xl p-3 shadow-2xl"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
            Account
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: 'var(--amber)', backgroundColor: 'rgba(255,159,26,0.14)' }}
          >
            DEMO
          </span>
        </div>

        <div className="mb-3 space-y-1 text-[12px]" style={{ color: 'var(--muted)' }}>
          <div className="flex justify-between">
            <span>Email</span>
            <span style={{ color: 'var(--text)' }}>{user?.email || 'demo@korofx.com'}</span>
          </div>
          <div className="flex justify-between">
            <span>ID</span>
            <span className="mono" style={{ color: 'var(--text)' }}>
              {user?.id ?? 'KFX-000000'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Currency</span>
            <span className="flex items-center gap-2" style={{ color: 'var(--text)' }}>
              USD
              <button
                type="button"
                onClick={onExchange}
                className="text-[10px] font-bold uppercase"
                style={{ color: 'var(--blue)' }}
              >
                Change
              </button>
            </span>
          </div>
        </div>

        <AccountRow
          label="Live Account"
          balance={0}
          selected={false}
          note="The daily limit is not set"
          action="Set limit"
          onSelect={() => undefined}
        />
        <AccountRow
          label="Demo Account"
          balance={balance}
          selected
          onSelect={() => undefined}
          onReset={onReset}
        />
      </div>
    </div>
  );
}

function AccountRow({
  label,
  balance,
  selected,
  note,
  action,
  onSelect,
  onReset,
}: {
  label: string;
  balance: number;
  selected: boolean;
  note?: string;
  action?: string;
  onSelect: () => void;
  onReset?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left"
      style={{ backgroundColor: 'var(--panel-2)' }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
        style={{ border: `2px solid ${selected ? 'var(--blue)' : 'var(--muted)'}` }}
      >
        {selected && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
          {label}
        </span>
        <span className="mono block text-[13px]" style={{ color: 'var(--text)' }}>
          {formatMoney(balance)}
        </span>
        {note && (
          <span className="block text-[10px]" style={{ color: 'var(--muted)' }}>
            {note}
          </span>
        )}
      </span>
      {action && (
        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--blue)' }}>
          {action}
        </span>
      )}
      {onReset && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Reset demo balance"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onReset();
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--panel)' }}
        >
          <RefreshCw size={13} color="var(--muted)" />
        </span>
      )}
      {!action && !onReset && <ChevronDown size={14} color="var(--muted)" />}
    </button>
  );
}
