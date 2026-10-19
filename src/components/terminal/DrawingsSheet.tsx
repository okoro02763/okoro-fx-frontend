import { ChevronRight, Minus, Move, PenLine, Square } from 'lucide-react';
import Sheet from './Sheet';

export const DRAWING_TOOLS = [
  { key: 'trend', label: 'Trend Line', icon: PenLine },
  { key: 'horizontal', label: 'Horizontal line', icon: Minus },
  { key: 'vertical', label: 'Vertical line', icon: Move },
  { key: 'ray', label: 'Ray', icon: PenLine },
  { key: 'rectangle', label: 'Rectangle', icon: Square },
] as const;

export type DrawingKey = typeof DRAWING_TOOLS[number]['key'];

interface DrawingsSheetProps {
  open: boolean;
  onClose: () => void;
  active: DrawingKey[];
  onToggle: (key: DrawingKey) => void;
  onClear: () => void;
}

export default function DrawingsSheet({
  open,
  onClose,
  active,
  onToggle,
  onClear,
}: DrawingsSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Drawings" variant="bottom">
      <div className="p-3">
        {DRAWING_TOOLS.map(({ key, label, icon: Icon }) => {
          const selected = active.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className="mb-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left"
              style={{ backgroundColor: 'var(--panel-2)' }}
            >
              <Icon size={17} color={selected ? 'var(--blue)' : 'var(--muted)'} />
              <span
                className="flex-1 text-[13px] font-medium"
                style={{ color: selected ? 'var(--blue)' : 'var(--text)' }}
              >
                {label}
              </span>
              <ChevronRight size={16} color="var(--muted)" />
            </button>
          );
        })}
        <button
          type="button"
          onClick={onClear}
          className="mt-3 w-full rounded-xl py-3 text-[13px] font-bold"
          style={{ backgroundColor: 'var(--panel-2)', color: 'var(--red)' }}
        >
          Delete all
        </button>
      </div>
    </Sheet>
  );
}
