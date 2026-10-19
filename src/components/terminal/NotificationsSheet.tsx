import { useState } from 'react';
import Sheet from './Sheet';

interface NotificationsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface Notice {
  id: number;
  title: string;
  body: string;
  date: string;
  unread: boolean;
  accent: string;
}

const SEED: Notice[] = [
  {
    id: 1,
    title: 'Welcome to KoroFX',
    body: 'Your demo account is funded with virtual funds. Start trading risk-free.',
    date: '15 Oct 2026',
    unread: true,
    accent: 'var(--blue)',
  },
  {
    id: 2,
    title: 'New payouts available',
    body: 'Crypto pairs now pay up to 95% on longer expiries.',
    date: '14 Oct 2026',
    unread: true,
    accent: 'var(--amber)',
  },
  {
    id: 3,
    title: 'Scheduled maintenance',
    body: 'The platform will be briefly unavailable on Sunday 02:00 UTC.',
    date: '12 Oct 2026',
    unread: false,
    accent: 'var(--green)',
  },
];

export default function NotificationsSheet({ open, onClose }: NotificationsSheetProps) {
  const [items, setItems] = useState(SEED);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Notifications"
      headerRight={
        <button
          type="button"
          onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
          className="text-[10px] font-bold uppercase"
          style={{ color: 'var(--blue)' }}
        >
          Mark all as read
        </button>
      }
    >
      <div className="relative p-4">
        <div
          className="absolute bottom-8 left-[34px] top-8 w-px"
          style={{ backgroundColor: 'var(--border)' }}
          aria-hidden="true"
        />
        {items.map((n) => (
          <div key={n.id} className="relative mb-3 flex gap-3">
            <span
              className="z-[1] mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: n.accent, boxShadow: '0 0 0 3px var(--bg)' }}
            />
            <div
              className="flex-1 rounded-2xl p-3"
              style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
            >
              <div
                className="mb-2 h-20 w-full rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${n.accent}, rgba(28,32,51,0.6))`,
                }}
              />
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                  {n.title}
                </span>
                {n.unread && (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--red)' }} />
                )}
              </div>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
                {n.body}
              </p>
              <p className="mt-2 text-[10px]" style={{ color: 'var(--faint)' }}>
                {n.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
