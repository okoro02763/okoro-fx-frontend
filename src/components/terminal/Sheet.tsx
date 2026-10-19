import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Full-screen sheet (default) vs. a bottom card. */
  variant?: 'full' | 'bottom';
  /** Optional action rendered on the right of the header. */
  headerRight?: ReactNode;
  /** Hide the default X (when a custom close is provided). */
  hideClose?: boolean;
}

export default function Sheet({
  open,
  onClose,
  title,
  children,
  variant = 'full',
  headerRight,
  hideClose,
}: SheetProps) {
  if (!open) return null;

  const full = variant === 'full';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/60 kt-fade"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`kt-sheet relative flex w-full flex-col overflow-hidden ${
          full ? 'h-full rounded-none' : 'max-h-[85vh] rounded-t-3xl'
        }`}
        style={{
          backgroundColor: 'var(--bg)',
          borderTop: full ? 'none' : '1px solid var(--border)',
        }}
        role="dialog"
        aria-modal="true"
      >
        {(title || !hideClose) && (
          <div
            className="kt-safe-top flex shrink-0 items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {!full && <span className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />}
            <div
              className="flex-1 text-[15px] font-semibold"
              style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}
            >
              {title}
            </div>
            {headerRight}
            {!hideClose && (
              <button type="button" onClick={onClose} aria-label="Close">
                <X size={20} color="var(--muted)" />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
