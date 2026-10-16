import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  HelpCircle,
  ListOrdered,
  MoreHorizontal,
  RotateCcw,
  User,
} from 'lucide-react';
import binaryApi from '../api/binary';
import { useAuth } from '../context/AuthContext';
import { usePriceStream } from '../hooks/usePriceStream';
import { useTerminal } from '../store/terminal';
import {
  formatMoney,
  formatPrice,
  formatSignedPercent,
} from '../lib/format';
import type { Candle, Direction, Trade, Wallet } from '../types/binary';
import PriceChart from '../components/terminal/PriceChart';
import ChartToolbar from '../components/terminal/ChartToolbar';
import TradePanel from '../components/terminal/TradePanel';
import TradesPanel from '../components/terminal/TradesPanel';
import TradesDrawer from '../components/terminal/TradesDrawer';
import PairSelectorModal from '../components/terminal/PairSelectorModal';

type Tab = 'chart' | 'trades' | 'help' | 'profile' | 'more';

interface Toast {
  id: number;
  type: 'win' | 'loss' | 'info' | 'error';
  text: string;
}

const TAB_ITEMS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'chart', label: 'Chart', icon: BarChart3 },
  { key: 'trades', label: 'Trades', icon: ListOrdered },
  { key: 'help', label: 'Help', icon: HelpCircle },
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'more', label: 'More', icon: MoreHorizontal },
];

function toastColor(type: Toast['type']): string {
  if (type === 'win') return 'var(--profit)';
  if (type === 'loss' || type === 'error') return 'var(--loss)';
  return 'var(--gold)';
}

export default function TerminalPage() {
  const { user } = useAuth();
  const {
    symbol,
    timeframe,
    chartType,
    stake,
    durationSeconds,
    favorites,
    setSymbol,
    setTimeframe,
    setChartType,
    setStake,
    setDuration,
    toggleFavorite,
  } = useTerminal();

  const { quote, connected } = usePriceStream(symbol);

  const [tab, setTab] = useState<Tab>('chart');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const prevOpenIdsRef = useRef<Set<number>>(new Set());
  const firstLoadRef = useRef(true);
  const toastSeq = useRef(0);

  const pushToast = useCallback((type: Toast['type'], text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Load candles whenever the symbol or timeframe changes (and refresh on a
  // slow timer so the series stays aligned with the live ticks).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCandlesLoading(true);
      try {
        const rows = await binaryApi.getCandles(symbol, timeframe.key, 300);
        if (!cancelled) setCandles(rows);
      } catch {
        if (!cancelled) setCandles([]);
      } finally {
        if (!cancelled) setCandlesLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, timeframe.key]);

  // Poll trades (the response also carries the wallet). Detect trades that
  // moved from open -> settled to raise the result toast.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await binaryApi.getTrades();
        if (cancelled) return;
        const prev = prevOpenIdsRef.current;
        const settled = res.results.filter(
          (t) => t.status !== 'open' && prev.has(t.id)
        );
        if (settled.length && !firstLoadRef.current) {
          settled.forEach((t) => {
            if (t.status === 'won') {
              pushToast('win', `Won +${formatMoney(parseFloat(t.profit))} on ${t.symbol}`);
            } else if (t.status === 'lost') {
              pushToast('loss', `Lost ${formatMoney(parseFloat(t.stake))} on ${t.symbol}`);
            } else {
              pushToast('info', `Refunded ${formatMoney(parseFloat(t.stake))} on ${t.symbol}`);
            }
          });
        }
        prevOpenIdsRef.current = new Set(
          res.results.filter((t) => t.status === 'open').map((t) => t.id)
        );
        firstLoadRef.current = false;
        setTrades(res.results);
        setWallet(res.wallet);
        setTradesLoading(false);
      } catch {
        if (!cancelled) setTradesLoading(false);
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pushToast]);

  // 1s clock for open-trade countdowns.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleTrade = async (direction: Direction) => {
    if (placing) return;
    setPlacing(true);
    try {
      const res = await binaryApi.openTrade({
        symbol,
        direction,
        stake,
        duration_seconds: durationSeconds,
      });
      setWallet(res.wallet);
      setTrades((prev) => [res.trade, ...prev]);
      prevOpenIdsRef.current = new Set(
        Array.from(prevOpenIdsRef.current).concat(res.trade.id)
      );
      pushToast(
        'info',
        `${direction === 'buy' ? 'Buy' : 'Sell'} ${symbol} — ${formatMoney(stake)}`
      );
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Could not open the trade.';
      pushToast('error', detail);
    } finally {
      setPlacing(false);
    }
  };

  const handleReset = async () => {
    try {
      const fresh = await binaryApi.resetWallet();
      setWallet(fresh);
      pushToast('info', 'Demo balance reset to $10,000');
    } catch {
      pushToast('error', 'Could not reset the demo balance.');
    }
  };

  const price = quote?.price ?? 0;
  const change = quote?.percent_change ?? 0;
  const changeColor = change >= 0 ? 'var(--profit)' : 'var(--loss)';
  const payoutPercent = quote?.payout_percent ?? 80;
  const openTradeCount = trades.filter((t) => t.status === 'open').length;

  return (
    <div className="fp-root flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top bar */}
      <header
        className="shrink-0 px-3 py-2"
        style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1 text-[12px]"
            style={{ fontFamily: 'Inter', color: 'var(--sub)' }}
          >
            <ArrowLeft size={15} /> Dashboard
          </Link>
          <span
            className="ml-auto rounded px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: 'var(--gold)', backgroundColor: 'rgba(232,180,84,0.12)' }}
          >
            DEMO
          </span>
          <span className="text-[14px] font-bold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}>
            {wallet ? formatMoney(parseFloat(wallet.demo_balance)) : '—'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset demo balance"
            className="flex h-7 w-7 items-center justify-center rounded"
            style={{ border: '1px solid var(--border)' }}
          >
            <RotateCcw size={13} color="var(--sub)" />
          </button>
          <Link
            to="/account"
            className="rounded px-2.5 py-1 text-[12px] font-semibold"
            style={{ fontFamily: 'Inter', color: 'var(--bg)', backgroundColor: 'var(--gold)' }}
          >
            Deposit
          </Link>
        </div>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[16px] font-semibold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}>
            {symbol}
          </span>
          <span
            className="text-[15px] font-medium tabular-nums"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}
          >
            {price ? formatPrice(price) : '—'}
          </span>
          <span className="text-[12px] font-medium" style={{ fontFamily: 'Inter', color: changeColor }}>
            {formatSignedPercent(change)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px]" style={{ color: 'var(--sub)' }}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: connected ? 'var(--profit)' : 'var(--loss)' }}
            />
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="relative min-h-0 flex-1">
        {tab === 'chart' && (
          <div className="flex h-full flex-col">
            <div className="shrink-0" style={{ backgroundColor: 'var(--panel)' }}>
              <ChartToolbar
                timeframe={timeframe}
                onTimeframe={setTimeframe}
                chartType={chartType}
                onChartType={setChartType}
              />
            </div>
            <div className="relative min-h-0 flex-1">
              <PriceChart
                symbol={symbol}
                candles={candles}
                chartType={chartType}
                intervalSeconds={timeframe.seconds}
                tick={quote}
                trades={trades}
                now={now}
              />
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open trades"
                className="absolute bottom-4 left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-xl"
                style={{
                  backgroundColor: 'var(--panel2)',
                  border: '1px solid var(--border)',
                }}
              >
                <Briefcase size={17} color="var(--gold)" />
                {openTradeCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--gold)', color: 'var(--bg)' }}
                  >
                    {openTradeCount}
                  </span>
                )}
              </button>
              {candlesLoading && candles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[13px]" style={{ color: 'var(--sub)' }}>
                  Loading chart…
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'trades' && (
          <TradesPanel trades={trades} now={now} loading={tradesLoading} />
        )}

        {tab === 'help' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--sub)', fontFamily: 'Inter' }}>
            <h2 className="mb-3 text-[16px] font-semibold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}>
              How it works
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Pick a direction (Buy if you expect the price to rise, Sell if it should fall).</li>
              <li>Choose an expiry — the trade settles automatically when it runs out.</li>
              <li>Set a stake. A win pays back your stake plus the fixed payout percentage.</li>
              <li>This is a paper-trading demo: balances are virtual and no real money moves.</li>
            </ul>
          </div>
        )}

        {tab === 'profile' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--sub)', fontFamily: 'Inter' }}>
            <h2 className="mb-1 text-[16px] font-semibold" style={{ fontFamily: 'Space Grotesk', color: 'var(--text)' }}>
              {user?.name || user?.email || 'Account'}
            </h2>
            <p className="mb-4">{user?.email}</p>
            <div className="flex flex-col gap-2">
              <Link to="/account" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel2)', color: 'var(--text)' }}>
                Account & verification
              </Link>
              <Link to="/referrals" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel2)', color: 'var(--text)' }}>
                Referrals
              </Link>
            </div>
          </div>
        )}

        {tab === 'more' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--sub)', fontFamily: 'Inter' }}>
            <div className="flex flex-col gap-2">
              <Link to="/" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel2)', color: 'var(--text)' }}>
                Bot dashboard
              </Link>
              <Link to="/analytics" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel2)', color: 'var(--text)' }}>
                Analytics
              </Link>
              <Link to="/settings/strategy" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel2)', color: 'var(--text)' }}>
                Strategy settings
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Trade panel (chart tab only) */}
      {tab === 'chart' && (
        <TradePanel
          symbol={symbol}
          payoutPercent={payoutPercent}
          stake={stake}
          durationSeconds={durationSeconds}
          placing={placing}
          onOpenPair={() => setPairModalOpen(true)}
          onStake={setStake}
          onDuration={setDuration}
          onTrade={handleTrade}
        />
      )}

      {/* Bottom tab bar */}
      <nav
        className="flex shrink-0 items-stretch"
        style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
      >
        {TAB_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <Icon size={18} color={active ? 'var(--gold)' : 'var(--sub)'} />
              <span className="text-[10px]" style={{ fontFamily: 'Inter', color: active ? 'var(--gold)' : 'var(--sub)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-[13px] font-medium shadow-2xl"
            style={{
              fontFamily: 'Inter',
              backgroundColor: 'var(--panel2)',
              border: `1px solid ${toastColor(t.type)}`,
              color: 'var(--text)',
            }}
          >
            <span style={{ color: toastColor(t.type), fontWeight: 700 }}>
              {t.type === 'win' ? 'You won' : t.type === 'loss' ? 'You lost' : t.type === 'error' ? 'Error' : 'Placed'}
            </span>{' '}
            {t.text}
          </div>
        ))}
      </div>

      <PairSelectorModal
        open={pairModalOpen}
        onClose={() => setPairModalOpen(false)}
        currentSymbol={symbol}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onSelect={(next) => {
          setSymbol(next);
          setPairModalOpen(false);
        }}
      />

      <TradesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        trades={trades}
        now={now}
      />
    </div>
  );
}
