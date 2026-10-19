import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Star } from 'lucide-react';
import Sheet from './Sheet';
import binaryApi from '../../api/binary';
import type { Category, Instrument } from '../../types/binary';

interface PairSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentSymbol: string;
  favorites: string[];
  onToggleFavorite: (symbol: string) => void;
  onSelect: (symbol: string) => void;
}

const TABS: { key: Category; label: string }[] = [
  { key: 'currencies', label: 'Currencies' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodities', label: 'Commodities' },
  { key: 'stocks', label: 'Stocks' },
];

function Flag() {
  return (
    <span className="relative h-6 w-8 shrink-0">
      <span className="absolute left-0 top-0 h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
      <span className="absolute left-2.5 top-0 h-6 w-6 rounded-full" style={{ backgroundColor: 'var(--amber)' }} />
    </span>
  );
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
  const [tab, setTab] = useState<Category>('crypto');
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
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
    return instruments
      .filter((i) => {
        if (favOnly && !favorites.includes(i.symbol)) return false;
        if (!favOnly && i.category !== tab) return false;
        if (!q) return true;
        return i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [instruments, tab, query, favorites, favOnly]);

  return (
    <Sheet open={open} onClose={onClose} title="Select trade pair">
      {/* Tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {TABS.map((t) => {
          const active = !favOnly && t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setFavOnly(false);
                setTab(t.key);
              }}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase"
              style={{
                backgroundColor: active ? 'var(--blue)' : 'var(--panel-2)',
                color: active ? '#fff' : 'var(--muted)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Favorites + search + sort */}
      <div className="px-4">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFavOnly((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={{
              backgroundColor: favOnly ? 'var(--amber)' : 'var(--panel-2)',
              color: favOnly ? '#1c2033' : 'var(--text)',
            }}
          >
            <Star size={13} color={favOnly ? '#1c2033' : 'var(--amber)'} fill={favOnly ? '#1c2033' : 'none'} />
            {favorites.length}
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 rounded-full px-3.5 py-1.5 text-[13px] outline-none"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}
          />
        </div>
        <div className="mb-2 text-[11px]" style={{ color: 'var(--muted)' }}>
          Sort by: <span style={{ color: 'var(--text)' }}>Name</span>
        </div>
      </div>

      {/* List */}
      <div className="pb-6">
        {loading && (
          <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Loading instruments…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
            Nothing here yet.
          </div>
        )}
        {!loading &&
          filtered.map((i) => {
            const fav = favorites.includes(i.symbol);
            const pct = i.percent_change ?? 0;
            const up = pct >= 0;
            const short = i.payout_percent_short ?? i.payout_percent;
            const long = i.payout_percent_long ?? String(Math.min(95, Number(i.payout_percent) + 3));
            return (
              <div
                key={i.symbol}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: i.symbol === currentSymbol ? 'var(--panel-2)' : 'transparent',
                }}
              >
                <button
                  type="button"
                  aria-label="Toggle favorite"
                  onClick={() => onToggleFavorite(i.symbol)}
                  className="shrink-0"
                >
                  <Star size={16} color={fav ? 'var(--amber)' : 'var(--faint)'} fill={fav ? 'var(--amber)' : 'none'} />
                </button>

                <button
                  type="button"
                  onClick={() => onSelect(i.symbol)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Flag />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                      {i.name}
                    </span>
                    <span className="block truncate text-[11px]">
                      <span style={{ color: 'var(--muted)' }}>Profit 1+ min </span>
                      <span style={{ color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--amber)' }}>{Math.round(Number(short))}%</span>
                      </span>
                      <span style={{ color: 'var(--muted)' }}>  5+ min </span>
                      <span style={{ color: 'var(--amber)' }}>{Math.round(Number(long))}%</span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className="mono text-[12px] font-semibold"
                      style={{ color: up ? 'var(--green)' : 'var(--red)' }}
                    >
                      {up ? '+' : ''}
                      {pct.toFixed(2)}%
                    </span>
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: up ? 'var(--green)' : 'var(--red)' }}
                    >
                      {up ? (
                        <ArrowUpRight size={13} color="#fff" />
                      ) : (
                        <ArrowDownRight size={13} color="#fff" />
                      )}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
      </div>
    </Sheet>
  );
}
