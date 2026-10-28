import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ShieldCheck, TrendingUp } from 'lucide-react';
import binaryApi from '../api/binary';
import { useAuth } from '../context/AuthContext';
import { useMarketData } from '../hooks/useMarketData';
import { useTerminal } from '../store/terminal';
import { useSettings } from '../store/settings';
import { formatMoney, formatPrice, formatSignedPercent } from '../lib/format';
import type { Direction, IndicatorKey, Trade, Wallet } from '../types/binary';
import type { DrawingKey } from '../components/terminal/DrawingsSheet';
import TopBar from '../components/terminal/TopBar';
import PromoStrip from '../components/terminal/PromoStrip';
import BottomTabBar, { type TabKey, TAB_BAR_HEIGHT } from '../components/terminal/BottomTabBar';
import ChartToolbar from '../components/terminal/ChartToolbar';
import PriceChart from '../components/terminal/PriceChart';
import TradePanel from '../components/terminal/TradePanel';
import TradesSheet from '../components/terminal/TradesSheet';
import PairSelectorModal from '../components/terminal/PairSelectorModal';
import NotificationsSheet from '../components/terminal/NotificationsSheet';
import AccountDropdown from '../components/terminal/AccountDropdown';
import ExchangeFormModal from '../components/terminal/ExchangeFormModal';
import SettingsModal from '../components/terminal/SettingsModal';

interface Toast {
  id: number;
  type: 'win' | 'loss' | 'info' | 'error';
  text: string;
}

const FALLBACK_BALANCE = 10022.5;

function toastColor(type: Toast['type']): string {
  if (type === 'win') return 'var(--green)';
  if (type === 'loss' || type === 'error') return 'var(--red)';
  return 'var(--blue)';
}

export default function TerminalPage() {
  const { user } = useAuth();
  const {
    symbol,
    timeframe,
    chartType,
    stakeMode,
    stakeValue,
    durationSeconds,
    pendingTrade,
    favorites,
    setSymbol,
    setTimeframe,
    setChartType,
    setStakeMode,
    setStakeValue,
    setDuration,
    setPendingTrade,
    toggleFavorite,
  } = useTerminal();

  const market = useMarketData(symbol, timeframe.seconds);
  const { candles, price, change24h, status, loading } = market;

  const [tab, setTab] = useState<TabKey>('chart');
  const [promoOpen, setPromoOpen] = useState(true);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [instrumentName, setInstrumentName] = useState<string>('');
  const [payoutPercent, setPayoutPercent] = useState(80);
  const [pairOpen, setPairOpen] = useState(false);
  const [tradesOpen, setTradesOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [indicators, setIndicators] = useState<IndicatorKey[]>([]);
  const [drawings, setDrawings] = useState<DrawingKey[]>([]);

  const prevOpenIdsRef = useRef<Set<number>>(new Set());
  const firstLoadRef = useRef(true);
  const toastSeq = useRef(0);

  const pushToast = useCallback((type: Toast['type'], text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  // Load the instrument name for the current symbol (for the trade panel).
  useEffect(() => {
    let cancelled = false;
    binaryApi
      .getInstruments()
      .then((rows) => {
        if (cancelled) return;
        const found = rows.find((r) => r.symbol === symbol);
        setInstrumentName(found?.name ?? symbol);
        if (found) setPayoutPercent(Math.round(Number(found.payout_percent)) || 80);
      })
      .catch(() => {
        if (!cancelled) setInstrumentName(symbol);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Poll trades + wallet; raise a result toast when a trade settles.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await binaryApi.getTrades();
        if (cancelled) return;
        const prev = prevOpenIdsRef.current;
        const settled = res.results.filter((t) => t.status !== 'open' && prev.has(t.id));
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
      } catch {
        /* backend optional for the demo */
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pushToast]);

  // 1s clock for countdowns.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const balance = wallet ? parseFloat(wallet.demo_balance) : FALLBACK_BALANCE;
  const resolvedStake =
    stakeMode === 'percent' ? (balance * stakeValue) / 100 : stakeValue;
  const openTradeCount = trades.filter((t) => t.status === 'open').length;

  const { oneClickTrade } = useSettings();
  const [pendingConfirm, setPendingConfirm] = useState<Direction | null>(null);

  const executeTrade = async (direction: Direction) => {
    if (placing) return;
    if (resolvedStake > balance) {
      pushToast('error', 'Stake exceeds your demo balance.');
      return;
    }
    setPlacing(true);
    try {
      const res = await binaryApi.openTrade({
        symbol,
        direction,
        stake: resolvedStake,
        duration_seconds: durationSeconds,
      });
      setWallet(res.wallet);
      setTrades((prev) => [res.trade, ...prev]);
      prevOpenIdsRef.current = new Set(
        Array.from(prevOpenIdsRef.current).concat(res.trade.id)
      );
      pushToast('info', `${direction === 'buy' ? 'Buy' : 'Sell'} ${symbol} — ${formatMoney(resolvedStake)}`);
    } catch {
      pushToast('error', 'Could not open the trade. Backend unavailable.');
    } finally {
      setPlacing(false);
    }
  };

  const handleTrade = async (direction: Direction) => {
    if (oneClickTrade) {
      await executeTrade(direction);
      return;
    }
    setPendingConfirm(direction);
  };

  const handleReset = async () => {
    try {
      const fresh = await binaryApi.resetWallet();
      setWallet(fresh);
      pushToast('info', 'Demo balance reset');
    } catch {
      pushToast('error', 'Could not reset the demo balance.');
    }
  };

  const toggleIndicator = (key: IndicatorKey) =>
    setIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const toggleDrawing = (key: DrawingKey) =>
    setDrawings((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const changeColor = change24h >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="kt-root flex h-[100dvh] flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <TopBar
        balance={balance}
        unreadCount={2}
        onAccount={() => setAccountOpen((v) => !v)}
        onBell={() => setNotifOpen(true)}
        onDeposit={() => setExchangeOpen(true)}
      />

      {promoOpen && <PromoStrip onClose={() => setPromoOpen(false)} />}

      <main className="relative min-h-0 flex-1">
        {tab === 'chart' && (
          <div className="relative h-full w-full">
            <PriceChart
              symbol={symbol}
              candles={candles}
              chartType={chartType}
              intervalSeconds={timeframe.seconds}
              price={price}
              trades={trades}
              now={now}
              indicators={indicators}
            />

            {/* Price + status overlay (top-right, clear of the toolbar) */}
            <div className="pointer-events-none absolute right-2 top-2 z-[20] text-right">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>
                {symbol}
              </div>
              <div className="mono text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                {price ? formatPrice(price) : '—'}
              </div>
              <div className="text-[11px] font-semibold" style={{ color: changeColor }}>
                {formatSignedPercent(change24h)}
              </div>
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      status === 'live'
                        ? 'var(--green)'
                        : status === 'connecting'
                        ? 'var(--amber)'
                        : 'var(--red)',
                  }}
                />
                <span className="text-[10px] capitalize" style={{ color: 'var(--muted)' }}>
                  {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>
            </div>

            <ChartToolbar
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              chartType={chartType}
              onChartType={setChartType}
              indicators={indicators}
              onToggleIndicator={toggleIndicator}
              onClearIndicators={() => setIndicators([])}
              drawings={drawings}
              onToggleDrawing={toggleDrawing}
              onClearDrawings={() => setDrawings([])}
              openTradeCount={openTradeCount}
              onOpenTrades={() => setTradesOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            {loading && candles.length === 0 && (
              <div
                className="absolute inset-0 z-[25] flex items-center justify-center text-[13px]"
                style={{ color: 'var(--muted)' }}
              >
                Loading chart…
              </div>
            )}
          </div>
        )}

        {tab === 'help' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--muted)' }}>
            <h2 className="mb-3 text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              How it works
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Pick a direction: Buy if you expect the price to rise, Sell if it should fall.</li>
              <li>Choose an expiry time and an investment amount (or a % of your balance).</li>
              <li>A win pays back your stake plus the fixed payout percentage.</li>
              <li>This is a paper-trading demo — balances are virtual and no real money moves.</li>
            </ul>
          </div>
        )}

        {tab === 'profile' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--muted)' }}>
            <h2 className="mb-1 text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              {user?.name || user?.email || 'Account'}
            </h2>
            <p className="mb-4">{user?.email}</p>
            <div className="flex flex-col gap-2">
              <Link to="/account" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}>
                Account &amp; verification
              </Link>
              <Link to="/referrals" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}>
                Referrals
              </Link>
            </div>
          </div>
        )}

        {tab === 'trophy' && (
          <div className="h-full overflow-y-auto p-5">
            <h2 className="mb-3 text-[16px] font-semibold" style={{ color: 'var(--text)' }}>
              Achievements
            </h2>
            {[
              { icon: Award, title: 'First Steps', text: 'Place your first trade' },
              { icon: TrendingUp, title: 'On a Roll', text: 'Win 3 trades in a row' },
              { icon: ShieldCheck, title: 'Risk Manager', text: 'Use percent-based investing' },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="mb-2 flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: 'var(--panel-2)' }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--panel)' }}
                >
                  <Icon size={18} color="var(--amber)" />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                    {title}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {text}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'more' && (
          <div className="h-full overflow-y-auto p-5 text-[13px]" style={{ color: 'var(--muted)' }}>
            <div className="flex flex-col gap-2">
              <Link to="/" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}>
                Bot dashboard
              </Link>
              <Link to="/analytics" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}>
                Analytics
              </Link>
              <Link to="/settings/strategy" className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}>
                Strategy settings
              </Link>
            </div>
          </div>
        )}
      </main>

      {tab === 'chart' && (
        <TradePanel
          symbol={symbol}
          instrumentName={instrumentName}
          payoutPercent={payoutPercent}
          balance={balance}
          durationSeconds={durationSeconds}
          onDuration={setDuration}
          stakeMode={stakeMode}
          stakeValue={stakeValue}
          onStakeMode={setStakeMode}
          onStakeValue={setStakeValue}
          pendingTrade={pendingTrade}
          onPendingTrade={setPendingTrade}
          placing={placing}
          onOpenPair={() => setPairOpen(true)}
          onTrade={handleTrade}
        />
      )}

      <BottomTabBar
        active={tab}
        onChange={setTab}
        trophyBadge={1}
        moreBadge={2}
      />
      {/* The tab bar is position:fixed, so this spacer reserves its height
          (plus the iPhone home-indicator safe area) in the flex column. */}
      <div
        className="shrink-0"
        style={{
          height: TAB_BAR_HEIGHT,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[90] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-[13px] font-medium shadow-2xl"
            style={{
              backgroundColor: 'var(--panel-2)',
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
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        currentSymbol={symbol}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onSelect={(next) => {
          setSymbol(next);
          setPairOpen(false);
        }}
      />

      <TradesSheet
        open={tradesOpen}
        onClose={() => setTradesOpen(false)}
        trades={trades}
        now={now}
      />

      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />

      <AccountDropdown
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        user={user}
        balance={balance}
        onReset={handleReset}
        onExchange={() => {
          setAccountOpen(false);
          setExchangeOpen(true);
        }}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <ExchangeFormModal
        open={exchangeOpen}
        onClose={() => setExchangeOpen(false)}
        onConfirm={() => {
          setExchangeOpen(false);
          pushToast('info', 'Exchange request submitted (demo).');
        }}
      />

      {pendingConfirm && !oneClickTrade && (
        <>
          <div className="fixed inset-0 z-[95] bg-black/60" onClick={() => setPendingConfirm(null)} />
          <div
            className="fixed inset-x-0 bottom-0 z-[96] mx-auto max-w-md rounded-t-3xl p-4"
            style={{ backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)' }}
          >
            <div className="mb-2 text-center text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              Confirm trade
            </div>
            <div className="mb-4 text-center text-[13px]" style={{ color: 'var(--muted)' }}>
              {pendingConfirm === 'buy' ? 'Buy' : 'Sell'} {symbol} for {formatMoney(resolvedStake)}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="flex-1 rounded-xl py-3 text-[14px] font-semibold"
                style={{ backgroundColor: 'var(--panel-2)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dir = pendingConfirm;
                  setPendingConfirm(null);
                  if (dir) executeTrade(dir);
                }}
                className="flex-1 rounded-xl py-3 text-[14px] font-bold text-white"
                style={{ backgroundColor: pendingConfirm === 'buy' ? 'var(--green)' : 'var(--red)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
