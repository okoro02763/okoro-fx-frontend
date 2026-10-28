import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Check, Search, Star, X } from 'lucide-react';
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
  { key: 'currencies', label: 'CURRENCIES' },
  { key: 'crypto', label: 'CRYPTO' },
  { key: 'commodities', label: 'COMMODITIES' },
  { key: 'stocks', label: 'STOCKS' },
];

const FLAG_MAP: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  AUD: 'au',
  CAD: 'ca',
  CHF: 'ch',
  NZD: 'nz',
  NGN: 'ng',
  ZAR: 'za',
  TRY: 'tr',
  MXN: 'mx',
  SGD: 'sg',
  HKD: 'hk',
  CNY: 'cn',
  RUB: 'ru',
  BRL: 'br',
  INR: 'in',
  XAU: 'eu',
  XAG: 'eu',
  BTC: 'btc',
  ETH: 'eth',
};

function getCountry(code: string): string {
  return FLAG_MAP[code?.toUpperCase()] || code?.slice(0, 2)?.toLowerCase() || 'us';
}

function Flag({ symbol }: { symbol: string }) {
  const parts = symbol.split(/[\/\-_]/);
  const base = parts[0];
  const quote = parts[1];
  const baseCc = getCountry(base);
  const quoteCc = getCountry(quote);
  return (
    <span className="relative h-6 w-8 shrink-0">
      <img
        src={`https://flagcdn.com/w40/${baseCc}.png`}
        alt={base}
        className="absolute left-0 top-0 h-6 w-6 rounded-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <img
        src={`https://flagcdn.com/w40/${quoteCc}.png`}
        alt={quote}
        className="absolute left-2.5 top-0 h-6 w-6 rounded-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
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
  const [tab, setTab] = useState<Category>('currencies');
  const [query, setQuery] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'Name' | 'Profit' | 'Change'>('Name');

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
    let result = instruments
      .filter((i) => {
        if (favOnly && !favorites.includes(i.symbol)) return false;
        if (!favOnly && i.category !== tab) return false;
        if (!q) return true;
        return i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
      });
    
    if (sortBy === 'Name') {
      result = result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Change') {
      result = result.sort((a, b) => (b.percent_change ?? 0) - (a.percent_change ?? 0));
    } else if (sortBy === 'Profit') {
      result = result.sort((a, b) => Number(b.payout_percent) - Number(a.payout_percent));
    }
    
    return result;
  }, [instruments, tab, query, favorites, favOnly, sortBy]);

  const mobileContent = (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-[16px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'Space Grotesk' }}>
          Select trade pair
        </div>
        <button type="button" onClick={onClose} aria-label="Close">
          <X size={18} color="var(--muted)" />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
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
              className="shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase"
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
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setFavOnly((v) => !v)}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor: favOnly ? 'rgba(255,159,26,0.15)' : 'var(--panel-2)',
            color: favOnly ? 'var(--amber)' : 'var(--text)',
            border: `1px solid ${favOnly ? 'var(--amber)' : 'var(--border)'}`,
          }}
        >
          <Star size={12} color={favOnly ? 'var(--amber)' : 'var(--muted)'} fill={favOnly ? 'var(--amber)' : 'none'} />
          Favorites ({favorites.length})
        </button>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="var(--muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pair"
            className="w-full rounded-full pl-8 pr-3 py-1.5 text-[12px] outline-none"
            style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>
      <div className="pb-6">
        {loading && <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Loading instruments…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Nothing here yet.</div>}
        {!loading &&
          filtered.map((i) => {
            const fav = favorites.includes(i.symbol);
            const pct = i.percent_change ?? 0;
            const up = pct >= 0;
            const short = i.payout_percent_short ?? i.payout_percent;
            const long = i.payout_percent_long ?? String(Math.min(95, Number(i.payout_percent) + 3));
            const isSelected = i.symbol === currentSymbol;
            const displayName = i.symbol.replace('-', '/');
            return (
              <div
                key={i.symbol}
                className="flex items-center gap-2 px-4 py-2"
                style={{
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: isSelected ? 'rgba(43,140,255,0.08)' : 'transparent',
                }}
              >
                <button
                  type="button"
                  aria-label="Toggle favorite"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(i.symbol);
                  }}
                  className="shrink-0"
                  style={{ background: 'transparent', border: 'none' }}
                >
                  <Star size={14} color={fav ? 'var(--amber)' : 'var(--muted)'} fill={fav ? 'var(--amber)' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(i.symbol)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  style={{ background: 'transparent', border: 'none', color: 'inherit' }}
                >
                  <Flag symbol={i.symbol} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{displayName}</div>
                    <div className="truncate text-[10px]" style={{ color: 'var(--muted)' }}>
                      Profit {Math.round(Number(short))}% / {Math.round(Number(long))}%
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {up ? '+' : ''}
                      {pct.toFixed(2)}%
                    </span>
                    {isSelected && <Check size={16} color="var(--blue)" />}
                  </div>
                </button>
              </div>
            );
          })}
      </div>
    </>
  );

  const desktopContent = (
    <>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="text-[16px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'Space Grotesk' }}>Select trade pair</div>
        <button type="button" onClick={onClose} aria-label="Close"><X size={18} color="var(--muted)" /></button>
      </div>
      <div className="flex gap-2 px-6 py-2">
        {TABS.map((t) => {
          const active = !favOnly && t.key === tab;
          return (
            <button key={t.key} type="button" onClick={() => { setFavOnly(false); setTab(t.key); }} className="rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase" style={{ backgroundColor: active ? 'var(--blue)' : 'var(--panel-2)', color: active ? '#fff' : 'var(--muted)' }}>
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-6 py-2">
        <button type="button" onClick={() => setFavOnly((v) => !v)} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: favOnly ? 'rgba(255,159,26,0.15)' : 'var(--panel-2)', color: favOnly ? 'var(--amber)' : 'var(--text)', border: `1px solid ${favOnly ? 'var(--amber)' : 'var(--border)'}` }}>
          <Star size={12} color={favOnly ? 'var(--amber)' : 'var(--muted)'} fill={favOnly ? 'var(--amber)' : 'none'} />
          Favorites ({favorites.length})
        </button>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="var(--muted)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pair" className="w-full rounded-full pl-8 pr-3 py-1.5 text-[12px] outline-none" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)' }} />
        </div>
      </div>
      <div className="flex px-6 py-1.5 text-[10px] uppercase" style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
        <div className="w-[220px]">Name</div>
        <div className="flex-1">24h changing</div>
        <div className="w-[110px] text-right">Profit 1+ min</div>
        <div className="w-[90px] text-right">5+ min</div>
        <div className="w-10" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Loading instruments…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Nothing here yet.</div>}
        {!loading &&
          filtered.map((i) => {
            const fav = favorites.includes(i.symbol);
            const pct = i.percent_change ?? 0;
            const up = pct >= 0;
            const short = i.payout_percent_short ?? i.payout_percent;
            const long = i.payout_percent_long ?? String(Math.min(95, Number(i.payout_percent) + 3));
            const isSelected = i.symbol === currentSymbol;
            const displayName = i.symbol.replace('-', '/');
            return (
              <div key={i.symbol} className="flex items-center gap-2 px-6 py-2" style={{ borderBottom: '1px solid var(--border)', backgroundColor: isSelected ? 'rgba(43,140,255,0.08)' : 'transparent' }}>
                <button type="button" aria-label="Toggle favorite" onClick={(e) => { e.stopPropagation(); onToggleFavorite(i.symbol); }} className="shrink-0" style={{ background: 'transparent', border: 'none' }}>
                  <Star size={14} color={fav ? 'var(--amber)' : 'var(--muted)'} fill={fav ? 'var(--amber)' : 'none'} />
                </button>
                <button type="button" onClick={() => onSelect(i.symbol)} className="flex min-w-0 flex-1 items-center gap-3 text-left" style={{ background: 'transparent', border: 'none', color: 'inherit' }}>
                  <Flag symbol={i.symbol} />
                  <div className="w-[200px] truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{displayName}</div>
                  <div className="flex flex-1 items-center">
                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {up ? '+' : ''}
                      {pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-[110px] text-right text-[11px]" style={{ color: 'var(--amber)' }}>{Math.round(Number(short))}%</div>
                  <div className="w-[90px] text-right text-[11px]" style={{ color: 'var(--amber)' }}>{Math.round(Number(long))}%</div>
                  <div className="flex w-10 justify-end">{isSelected && <Check size={16} color="var(--blue)" />}</div>
                </button>
              </div>
            );
          })}
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet open={open} onClose={onClose} title={null}>
          {mobileContent}
        </Sheet>
      </div>
      {open && (
        <div className="fixed inset-0 z-[85] hidden lg:flex lg:items-start lg:justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <div
            className="relative mt-16 flex w-[620px] max-h-[70vh] flex-col overflow-hidden rounded-xl shadow-2xl"
            style={{ backgroundColor: '#14161f', border: '1px solid var(--border)' }}
          >
            {desktopContent}
          </div>
        </div>
      )}
    </>
  );
}
