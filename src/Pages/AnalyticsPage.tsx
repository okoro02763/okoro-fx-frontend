import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
} from '../api/analytics';

function mockSummary(): AnalyticsSummary {
  return {
    totalTrades: 1284,
    closedTrades: 1210,
    openPositions: 74,
    totalPnl: 18430.55,
    winRate: 0.68,
    profitByPair: [
      { pair: 'EUR/USD', pnl: 6120.4, trades: 320, winRate: 0.72 },
      { pair: 'GBP/USD', pnl: 3880.1, trades: 245, winRate: 0.65 },
      { pair: 'USD/JPY', pnl: 2975.6, trades: 210, winRate: 0.7 },
      { pair: 'AUD/USD', pnl: 1804.0, trades: 180, winRate: 0.62 },
      { pair: 'USD/CAD', pnl: 1230.3, trades: 130, winRate: 0.66 },
      { pair: 'EUR/GBP', pnl: 1150.9, trades: 125, winRate: 0.64 },
      { pair: 'NZD/USD', pnl: 720.2, trades: 90, winRate: 0.6 },
      { pair: 'USD/CHF', pnl: 559.1, trades: 70, winRate: 0.58 },
    ],
    dailyPnl: [
      { date: '2026-08-22', pnl: 320.1 },
      { date: '2026-08-23', pnl: -142.3 },
      { date: '2026-08-24', pnl: 610.8 },
      { date: '2026-08-25', pnl: 245.0 },
      { date: '2026-08-26', pnl: -85.4 },
      { date: '2026-08-27', pnl: 490.6 },
      { date: '2026-08-28', pnl: 380.2 },
    ],
    equity: [],
  };
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary>(mockSummary);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAnalyticsSummary(token)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        // keep mock data if backend isn't populated
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const equityData =
    summary.equity.length > 0
      ? summary.equity
      : summary.dailyPnl.map((d) => ({
          timestamp: d.date,
          value: d.pnl,
        }));

  return (
    <DashboardLayout title="Data Analysis">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Total Trades" value={summary.totalTrades.toLocaleString()} />
        <StatCard label="Closed Trades" value={summary.closedTrades.toLocaleString()} />
        <StatCard label="Total P&L" value={summary.totalPnl >= 0 ? `+$${summary.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `-$${Math.abs(summary.totalPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <StatCard
          label="Win Rate"
          value={Math.round(summary.winRate * 100)}
          suffix="%"
        />
        <StatCard label="Open Positions" value={summary.openPositions} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <Card title="P&L by Pair ($)">
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.profitByPair}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="pair" stroke="var(--faint)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--faint)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  formatter={(value: number | string | Array<unknown>) => [
                    `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    'P&L',
                  ]}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {summary.profitByPair.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Daily P&L ($)">
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.dailyPnl}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="var(--faint)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--faint)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  formatter={(value: number | string | Array<unknown>) => [
                    `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    'P&L',
                  ]}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {summary.dailyPnl.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Performance (Equity)">
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" stroke="var(--faint)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--faint)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
                formatter={(value: number | string | Array<unknown>) => [
                  `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  'Value',
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--gold)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </DashboardLayout>
  );
}
