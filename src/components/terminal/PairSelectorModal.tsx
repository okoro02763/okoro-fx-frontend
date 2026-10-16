import { useEffect, useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import binaryApi from '../../api/binary';
import { formatSignedPercent } from '../../lib/format';
import type { Category, Instrument } from '../../types/binary';

interface PairSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentSymbol: string;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
  onSelect: (symbol: string) => void;
}

type TabKey = 'favorites' | Category;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'favorites', label: 'Favorites' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'stocks', label: 'Stocks' },
];

function changeColor(pct?: number): string {
  if (pct === undefined) return 'var(--sub)';
  return pct >= 0 ? 'var(--profit)' : 'var(--loss)';
}

export default function PairSelectorModal({
  open,
  onClose,
  currentSymbol,
  favorites,
  onToggleFavorite,
  onSelect,
}: PairSelectorModalProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('favorites');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    binaryApi
      .getInstruments(undefined, true)
      .then((rows) => {
        if (!cancelled) setInstruments(rows);
      })
      .catch(() => {
        if (!cancelled) setInstruments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instruments.filter((i) => {
      const inTab =
        tab === 'favorites' ? favorites.includes(i.symbol) : i.category === tab;
      if (!inTab) return false;
      if (!q) return true;
      return (
        i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
      );
    });
  }, [instruments, tab, query, favorites]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:h-[70vh] sm:rounded-2xl"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2
            className="text-[15px] font-semibold"
            style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}
          >
            Select trade pair
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} color="var(--sub)" />
          </button>
        </div>

        <div className="px-3 pt-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--panel2)', border: '1px solid var(--border)' }}
          >
            <Search size={15} color="var(--sub)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ fontFamily: 'Inter', color: 'var(--text)' }}
            />
          </div>
        </div>

        <div
          className="flex gap-1 overflow-x-auto px-3 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                style={{
                  fontFamily: 'Inter',
                  color: active ? 'var(--bg)' : 'var(--sub)',
                  backgroundColor: active ? 'var(--gold)' : 'transparent',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-[13px]" style={{ color: 'var(--sub)' }}>
              Loading instruments…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-[13px]" style={{ color: 'var(--sub)' }}>
              No instruments here yet.
            </div>
          )}
          {!loading &&
            filtered.map((i) => {
              const fav = favorites.includes(i.symbol);
              const pct = i.percent_change;
              return (
                <button
                  key={i.symbol}
                  type="button"
                  onClick={() => onSelect(i.symbol)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    backgroundColor:
                      i.symbol === currentSymbol ? 'var(--panel2)' : 'transparent',
                  }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(i.symbol);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleFavorite(i.symbol);
                      }
                    }}
                    className="shrink-0"
                    aria-label="Toggle favorite"
                  >
                    <Star
                      size={16}
                      color={fav ? 'var(--gold)' : 'var(--faint)'}
                      fill={fav ? 'var(--gold)' : 'none'}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[13px] font-semibold"
                      style={{ fontFamily: 'Inter', color: 'var(--text)' }}
                    >
                      {i.symbol}
                    </span>
                    <span
                      className="block truncate text-[11px]"
                      style={{ color: 'var(--sub)' }}
                    >
                      {i.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {pct !== undefined && (
                      <span
                        className="block text-[12px] font-medium"
                        style={{ fontFamily: 'Inter', color: changeColor(pct) }}
                      >
                        {formatSignedPercent(pct)}
                      </span>
                    )}
                    <span
                      className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: 'var(--profit)',
                        backgroundColor: 'rgba(56,217,169,0.12)',
                      }}
                    >
                      {Math.round(parseFloat(i.payout_percent))}%
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
