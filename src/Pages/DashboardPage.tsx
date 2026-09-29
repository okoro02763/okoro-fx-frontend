import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Toggle from '../components/Toggle';
import SessionStrip from '../components/SessionStrip';
import { useEquity } from '../hooks/useEquity';
import { useBotStatus } from '../hooks/useBotStatus';
import { useAuth } from '../context/AuthContext';
import { getAccountStatus, type AccountStatus } from '../api/account';

const SESSION_OFFSETS: Record<string, number> = {
  Sydney: 10, // UTC+10
  Tokyo: 9, // UTC+9
  London: 1, // UTC+1 (BST)
  'New York': -4, // UTC-4 (EDT)
};

const SESSION_OPEN: Record<string, [number, number]> = {
  Sydney: [7, 16],
  Tokyo: [8, 17],
  London: [14, 19],
  'New York': [18, 22],
};

function getSessions(now: Date) {
  return Object.entries(SESSION_OFFSETS).map(([city, offset]) => {
    const utc = now.getUTCHours() + now.getUTCMinutes() / 60;
    let local = (utc + offset + 24) % 24;
    const time = new Date(now.getTime() + offset * 3600000);
    const hh = String(time.getUTCHours()).padStart(2, '0');
    const mm = String(time.getUTCMinutes()).padStart(2, '0');
    const [open, close] = SESSION_OPEN[city];
    const openNow = local >= open && local < close;
    return { city, time: `${hh}:${mm}`, open: openNow };
  });
}

const MOCK_POSITIONS = [
  { symbol: 'EUR/USD', type: 'BUY', lots: 0.5, entry: 1.0832, current: 1.0841, profit: 45.2 },
  { symbol: 'GBP/JPY', type: 'SELL', lots: 0.2, entry: 189.34, current: 189.02, profit: 31.5 },
  { symbol: 'AUD/USD', type: 'BUY', lots: 0.8, entry: 0.6538, current: 0.6541, profit: -12.6 },
];

const MOCK_FILLS = [
  { id: 1, symbol: 'EUR/USD', type: 'BUY', lots: 0.5, price: 1.0832, profit: 45.2, time: '14:32:11' },
  { id: 2, symbol: 'GBP/JPY', type: 'SELL', lots: 0.2, price: 189.34, profit: 31.5, time: '14:28:54' },
  { id: 3, symbol: 'USD/JPY', type: 'BUY', lots: 0.3, price: 151.30, profit: -8.4, time: '14:21:07' },
  { id: 4, symbol: 'EUR/GBP', type: 'BUY', lots: 1.0, price: 0.8534, profit: 12.3, time: '14:10:43' },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const { equity, stale: equityStale } = useEquity();
  const { running, toggle, busy, error: botError } = useBotStatus();
  const [clock, setClock] = useState(new Date());
  const [account, setAccount] = useState<AccountStatus | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;
    getAccountStatus(token).then(setAccount).catch(() => {});
  }, [token]);

  const sessions = getSessions(clock);
  const totalPnl =
    MOCK_POSITIONS.reduce((sum, p) => sum + p.profit, 0) || 0;

  const showGate =
    !!account && account.accountType === 'live' && !account.liveVerified;

  return (
    <DashboardLayout title="Bot Dashboard">
      {showGate && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '14px 18px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--gold)',
            backgroundColor: 'var(--panel)',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontFamily: 'Inter',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--gold)',
              }}
            >
              Live trading requires identity verification
            </span>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                color: 'var(--sub)',
              }}
            >
              Upload a government document to unlock live trading. You can keep
              trading on the demo account meanwhile.
            </span>
          </div>
          <Link
            to="/account"
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '13px',
              fontWeight: 600,
              padding: '10px 16px',
              borderRadius: 'var(--radius-input)',
              backgroundColor: 'var(--gold)',
              color: '#0D0F1A',
              textDecoration: 'none',
            }}
          >
            Verify now
          </Link>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Bot Status" value={running ? 'Running' : 'Stopped'} style={{}} />
        <StatCard label="Open Positions" value={MOCK_POSITIONS.length} />
        <StatCard label="Total P&L" value={totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`} />
        <StatCard label="Win Rate" value="68" suffix="%" />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Automated Trading
          </span>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: '12px',
              color: running ? 'var(--profit)' : 'var(--sub)',
              margin: '4px 0 0',
            }}
          >
            {running ? 'Bot is live and executing trades' : 'Bot is idle'}
          </p>
        </div>
        <Toggle
          checked={running}
          onChange={toggle}
          disabled={busy}
          label={running ? 'Running' : 'Stopped'}
        />
      </div>

      {botError && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            borderRadius: '8px',
            border: '1px solid var(--loss)',
            color: 'var(--loss)',
            fontSize: '13px',
          }}
        >
          {botError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <Card title={'Equity Curve'}>
          {equityStale && (
            <p
              role="status"
              style={{
                margin: '0 0 8px',
                color: 'var(--loss)',
                fontSize: '12px',
              }}
            >
              Live updates unavailable — showing the last known data.
            </p>
          )}
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equity}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--faint)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--faint)"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  labelFormatter={(v) => new Date(v).toLocaleString()}
                  formatter={(value: number | string | Array<unknown>) =>
                    [`$${Number(value).toFixed(2)}`, 'Equity']
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Market Sessions">
          <SessionStrip sessions={sessions} />
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: '12px',
              color: 'var(--sub)',
              marginTop: '16px',
            }}
          >
            Session times shown in your local timezone. Open sessions are
            highlighted.
          </p>
        </Card>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px',
        }}
      >
        <Card title="Open Positions">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Pair', 'Type', 'Lots', 'Entry', 'P&L'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontFamily: 'Inter',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--faint)',
                      padding: '8px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_POSITIONS.map((p) => (
                <tr key={p.symbol}>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--text)' }}>{p.symbol}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px', color: p.type === 'BUY' ? 'var(--profit)' : 'var(--loss)' }}>{p.type}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--sub)' }}>{p.lots}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--sub)' }}>{p.entry}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 500, color: p.profit >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    {p.profit >= 0 ? '+' : ''}${Math.abs(p.profit).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent Fills">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Pair', 'Type', 'Price', 'P&L', 'Time'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontFamily: 'Inter',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--faint)',
                      padding: '8px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_FILLS.map((f) => (
                <tr key={f.id}>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--text)' }}>{f.symbol}</td>
                  <td style={{ padding: '10px 8px', fontSize: '12px', color: f.type === 'BUY' ? 'var(--profit)' : 'var(--loss)' }}>{f.type}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'var(--sub)' }}>{f.price}</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 500, color: f.profit >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    {f.profit >= 0 ? '+' : ''}${Math.abs(f.profit).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--faint)' }}>{f.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link
            to="/settings/strategy"
            style={{
              display: 'inline-block',
              marginTop: '14px',
              fontFamily: 'Inter',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--gold)',
              textDecoration: 'none',
            }}
          >
            Configure strategy →
          </Link>
        </Card>
      </div>

      {/* token referenced to keep hook consumers stable */}
      <span style={{ display: 'none' }} data-token={!!token} />
    </DashboardLayout>
  );
}
