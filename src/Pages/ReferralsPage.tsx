import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { getReferrals, type ReferralsInfo } from '../api/referral';
import { BRAND_NAME } from '../brand';

function mockReferrals(): ReferralsInfo {
  return {
    code: 'ABCD1234',
    referralLink: 'https://localhost:3000/signup?ref=ABCD1234',
    rewardBalance: 25,
    referrerReward: 10,
    refereeReward: 5,
    referralCount: 3,
    referred: [
      { name: 'Bob Bee', email: 'bob@example.com', reward: 10, createdAt: '2026-08-20T10:00:00Z' },
      { name: 'Carol Chen', email: 'carol@example.com', reward: 10, createdAt: '2026-08-22T14:30:00Z' },
      { name: 'Dave Diaz', email: 'dave@example.com', reward: 5, createdAt: '2026-08-25T09:15:00Z' },
    ],
  };
}

export default function ReferralsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ReferralsInfo>(mockReferrals);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getReferrals(token)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.referralLink);
    } catch {
      // clipboard not available; fall back to nothing
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DashboardLayout title="Referrals">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Reward Balance" value={`$${data.rewardBalance.toFixed(2)}`} />
        <StatCard label="People Referred" value={data.referralCount} />
        <StatCard label="Your Reward" value={`$${data.referrerReward.toFixed(2)}`} suffix="/person" />
        <StatCard label="Their Reward" value={`$${data.refereeReward.toFixed(2)}`} suffix="/person" />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Card title="Share your referral">
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)', marginTop: 0 }}>
            Invite friends to {BRAND_NAME}. You both get a reward when they sign up
            using your link.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '14px',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '12px 14px',
                backgroundColor: 'var(--panel2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-input)',
                fontFamily: 'JetBrains Mono',
                fontSize: '13px',
                color: 'var(--text)',
                wordBreak: 'break-all',
              }}
            >
              {data.referralLink}
            </div>
            <button
              type="button"
              onClick={copyLink}
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '13px',
                fontWeight: 600,
                padding: '12px 16px',
                backgroundColor: 'var(--gold)',
                border: 'none',
                borderRadius: 'var(--radius-input)',
                color: '#0D0F1A',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '14px',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
              Or share your code:
            </span>
            <span
              data-mono
              style={{
                fontFamily: 'JetBrains Mono',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--gold)',
                padding: '6px 14px',
                backgroundColor: 'var(--panel2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-input)',
              }}
            >
              {data.code}
            </span>
          </div>
        </Card>
      </div>

      <Card title="People you referred">
        {data.referred.length === 0 ? (
          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--faint)' }}>
            You haven't referred anyone yet. Share your link to get started.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Your Reward', 'Joined'].map((h) => (
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
              {data.referred.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '12px 10px', fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{r.name}</td>
                  <td style={{ padding: '12px 10px', fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>{r.email}</td>
                  <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: 500, color: 'var(--profit)' }}>
                    +${r.reward.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--faint)' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </DashboardLayout>
  );
}
