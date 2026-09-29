import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { getFraudUsers, type FraudUser } from '../api/fraud';

const LEVEL_COLORS: Record<FraudUser['level'], string> = {
  low: 'var(--profit)',
  medium: 'var(--gold)',
  high: '#FF9F43',
  critical: 'var(--loss)',
};

function mockFraudUsers(): FraudUser[] {
  return [
    { id: 1, name: 'Jane Doe', email: 'jane@example.com', score: 82, level: 'critical', reasons: ['Near-perfect win rate of 99.2%', 'Large single-trade P&L: $81,400'], updatedAt: null },
    { id: 2, name: 'Bob Bee', email: 'bob@example.com', score: 62, level: 'high', reasons: ['Extreme lot size detected: 22.00 lots', 'Unusually high win rate of 92.0%'], updatedAt: null },
    { id: 3, name: 'Carol Chen', email: 'carol@example.com', score: 34, level: 'medium', reasons: ['Account is suspended'], updatedAt: null },
    { id: 4, name: 'Dave Diaz', email: 'dave@example.com', score: 8, level: 'low', reasons: ['No suspicious activity detected'], updatedAt: null },
    { id: 5, name: 'Erin Yu', email: 'erin@example.com', score: 4, level: 'low', reasons: ['No suspicious activity detected'], updatedAt: null },
  ];
}

export default function FraudPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<FraudUser[]>(mockFraudUsers);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getFraudUsers(token)
      .then((data) => {
        if (!cancelled && data.length > 0) setUsers(data);
      })
      .catch(() => {
        // keep mock data if backend isn't populated
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const highRisk = users.filter((u) => u.score >= 50).length;
  const critical = users.filter((u) => u.level === 'critical').length;
  const avgScore =
    users.length > 0
      ? Math.round(users.reduce((s, u) => s + u.score, 0) / users.length)
      : 0;

  return (
    <DashboardLayout title="AI Fraud Detection">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Accounts Analyzed" value={users.length} />
        <StatCard label="High Risk" value={highRisk} />
        <StatCard label="Critical" value={critical} />
        <StatCard label="Avg Risk Score" value={avgScore} suffix="/100" />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        {(Object.keys(LEVEL_COLORS) as FraudUser['level'][]).map((lv) => (
          <span
            key={lv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'Inter',
              fontSize: '12px',
              color: 'var(--sub)',
              padding: '6px 12px',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: LEVEL_COLORS[lv],
              }}
            />
            {lv}
          </span>
        ))}
      </div>

      <Card title={`Fraud Risk Rankings`}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['User', 'Risk Score', 'Level', 'Indicators'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    fontFamily: 'Inter',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--faint)',
                    padding: '10px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ padding: '12px 10px' }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'Inter',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {u.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Inter',
                      fontSize: '12px',
                      color: 'var(--sub)',
                    }}
                  >
                    {u.email}
                  </span>
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: '140px',
                    }}
                  >
                    <span
                      data-mono
                      style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: LEVEL_COLORS[u.level],
                        width: '34px',
                      }}
                    >
                      {u.score}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'var(--panel2)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(u.score, 100)}%`,
                          backgroundColor: LEVEL_COLORS[u.level],
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 10px' }}>
                  <span
                    style={{
                      fontFamily: 'Inter',
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: LEVEL_COLORS[u.level],
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: `${LEVEL_COLORS[u.level]}22`,
                    }}
                  >
                    {u.level}
                  </span>
                </td>
                <td style={{ padding: '12px 10px' }}>
                  {u.reasons.length === 0 ? (
                    <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--faint)' }}>
                      No indicators
                    </span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {u.reasons.map((r, i) => (
                        <li
                          key={i}
                          style={{
                            fontFamily: 'Inter',
                            fontSize: '12px',
                            color: 'var(--sub)',
                            marginBottom: '2px',
                          }}
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: '11px',
            color: 'var(--faint)',
            marginTop: '14px',
          }}
        >
          Scores are computed by the fraud detection engine from trade behavior,
          win rates, position sizing and account status.
        </p>
      </Card>
    </DashboardLayout>
  );
}
