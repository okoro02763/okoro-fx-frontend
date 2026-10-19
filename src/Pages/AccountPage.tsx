import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Field, { inputStyle } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/format';
import {
  getAccountStatus,
  setAccountType,
  fundLiveAccount,
  createWithdrawal,
  getMyWithdrawals,
  type AccountStatus,
  type Withdrawal,
  type AccountType,
} from '../api/account';

type Tab = 'overview' | 'fund' | 'withdraw';

export default function AccountPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<Tab>('overview');

  const [fundAmount, setFundAmount] = useState('');
  const [wdAmount, setWdAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!token) return;
    getAccountStatus(token)
      .then((s) => setStatus(s))
      .catch(() => {});
    getMyWithdrawals(token)
      .then((w) => setWithdrawals(w))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSwitch = async (accountType: AccountType) => {
    if (!token) return;
    setError(null);
    setInfo(null);
    try {
      const s = await setAccountType(token, accountType);
      setStatus(s);
      if (accountType === 'live' && !s.liveVerified) {
        setTab('overview');
        setInfo('Choose an identity document to verify your live account.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch account.');
    }
  };

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const amount = parseFloat(fundAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Enter a valid amount.');
        return;
      }
      const res = await fundLiveAccount(token, amount);
      // Open the Paystack inline/redirect checkout.
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialise funding.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const amount = parseFloat(wdAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Enter a valid amount.');
        return;
      }
      await createWithdrawal(token, {
        amount,
        bankName,
        accountNumber,
        accountName,
      });
      setInfo('Withdrawal request submitted. It will be reviewed shortly.');
      resetWithdrawForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  const resetWithdrawForm = () => {
    setWdAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
  };

  if (!status) {
    return (
      <DashboardLayout title="My Account">
        <p style={{ fontFamily: 'Inter', color: 'var(--sub)' }}>Loading…</p>
      </DashboardLayout>
    );
  }

  const fees = status.fees;

  const tabStyle = (t: Tab): React.CSSProperties =>
    tab === t
      ? { ...pillBase, backgroundColor: 'var(--panel2)', color: 'var(--text)', borderColor: 'var(--gold)' }
      : pillBase;

  return (
    <DashboardLayout title="My Account">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Account Type" value={status.accountType.toUpperCase()} />
        <StatCard label="Available Balance" value={formatCurrency(status.availableBalance)} />
        <div
          className="px-4 py-4 sm:px-5 sm:py-[18px]"
          style={{
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span
            className="text-[11px] sm:text-xs"
            style={{ fontFamily: 'Inter', fontWeight: 500, color: 'var(--sub)' }}
          >
            Verification
          </span>
          <StatusBadge status={status.kycStatus} />
        </div>
      </div>

      {error && (
        <div style={msgStyle('var(--loss)')}>{error}</div>
      )}
      {info && (
        <div style={msgStyle('var(--gold)')}>{info}</div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['overview', 'fund', 'withdraw'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setError(null); setInfo(null); setTab(t); }}
            style={tabStyle(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card title="Account & Verification">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            {(['demo', 'live'] as AccountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSwitch(t)}
                style={
                  status.accountType === t
                    ? {
                        ...pillBase,
                        backgroundColor: 'var(--gold)',
                        color: '#0D0F1A',
                        borderColor: 'var(--gold)',
                      }
                    : pillBase
                }
              >
                {t.toUpperCase()} account
              </button>
            ))}
          </div>

          {!status.liveVerified && (
            <VerifyBanner status={status.kycStatus} />
          )}

          {!status.liveVerified && (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>
              Demo trading stays available to everyone. Once verified you can
              switch to the live account and fund your wallet to trade with
              real money.
            </p>
          )}
          {status.liveVerified && (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--profit)' }}>
              Your identity is verified. You can use the live (real-money) account.
            </p>
          )}
        </Card>
      )}

      {tab === 'fund' && (
        <Card title="Fund Live Account">
          {!status.liveVerified && <VerifyBanner status={status.kycStatus} />}
          {status.liveVerified && (
          <form onSubmit={handleFund}>
            <Field label="Amount (NGN)">
              <input
                type="number"
                min={100}
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="e.g. 10000"
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
                required
              />
            </Field>
            <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
              A service charge of {fees.fundingPercent}% is added to the amount you pay and debited
              from the total charged.
            </p>
            <PrimaryBtn disabled={loading} onClick={() => {}}>
              {loading ? 'Preparing checkout…' : 'Continue to payment'}
            </PrimaryBtn>
          </form>
          )}
        </Card>
      )}

      {tab === 'withdraw' && (
        <Card title="Withdraw Funds">
          {!status.liveVerified && <VerifyBanner status={status.kycStatus} />}
          {status.liveVerified && (
          <form onSubmit={handleWithdraw}>
            <Field label="Amount (NGN)">
              <input
                type="number"
                min={fees.minWithdrawal}
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                placeholder="e.g. 5000"
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
                required
              />
            </Field>
            <Field label="Bank name">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Access Bank" style={inputStyle} required />
            </Field>
            <Field label="Account number">
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 0123456789" style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }} required />
            </Field>
            <Field label="Account name">
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Jane Doe" style={inputStyle} required />
            </Field>
            <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
              A service charge of {fees.withdrawalPercent}% is deducted from your withdrawal.
              Minimum withdrawal: N{fees.minWithdrawal.toLocaleString()}.
            </p>
            <PrimaryBtn disabled={loading} onClick={() => {}}>
              {loading ? 'Submitting…' : 'Request withdrawal'}
            </PrimaryBtn>
          </form>
          )}

          {withdrawals.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: 'var(--text)', margin: '0 0 12px' }}>
                Withdrawal history
              </h4>
              <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Amount', 'Fee', 'Net', 'Status', 'Date'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontFamily: 'Inter', fontSize: '11px', color: 'var(--faint)', fontWeight: 500, padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td style={{ padding: '10px 6px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--text)' }}>N{Number(w.amount).toLocaleString()}</td>
                      <td style={{ padding: '10px 6px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--loss)' }}>-N{Number(w.fee).toLocaleString()}</td>
                      <td style={{ padding: '10px 6px', fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'var(--profit)' }}>N{Number(w.netAmount).toLocaleString()}</td>
                      <td style={{ padding: '10px 6px', fontFamily: 'Inter', fontSize: '12px', textTransform: 'capitalize', color: 'var(--sub)' }}>{w.status}</td>
                      <td style={{ padding: '10px 6px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--faint)' }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}

// Shared pill style so the tab pills and the DEMO/LIVE switch look identical:
// same height, radius and typography.
const pillBase: React.CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'capitalize',
  height: '38px',
  padding: '0 18px',
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 'var(--radius-pill)',
  backgroundColor: 'var(--panel)',
  color: 'var(--sub)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

/**
 * Shown on the LIVE switch, Fund and Withdraw tabs when the user is not yet
 * verified. Links to the verification wizard.
 */
function VerifyBanner({ status }: { status: AccountStatus['kycStatus'] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 16px',
        marginBottom: '16px',
        borderRadius: 'var(--radius-input)',
        backgroundColor: 'var(--panel2)',
        border: '1px solid var(--gold)',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 4px',
          }}
        >
          Verify your identity to unlock live trading
        </p>
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)', margin: 0 }}>
          Current status:{' '}
          {status === 'pending'
            ? 'under review — we usually respond within 24 hours.'
            : status === 'rejected'
            ? 'rejected — please resubmit your documents.'
            : 'not started. It takes about 3 minutes.'}
        </p>
      </div>
      <Link
        to="/account/verification"
        style={{
          fontFamily: 'Space Grotesk',
          fontSize: '13px',
          fontWeight: 600,
          padding: '10px 18px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--gold)',
          color: '#0D0F1A',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'pending' ? 'View status' : status === 'rejected' ? 'Resubmit' : 'Start verification'}
      </Link>
    </div>
  );
}

const msgStyle = (color: string): React.CSSProperties => ({
  fontFamily: 'Inter',
  fontSize: '13px',
  color,
  padding: '12px 16px',
  backgroundColor: 'var(--panel)',
  border: `1px solid ${color}`,
  borderRadius: 'var(--radius-input)',
  marginBottom: '16px',
});

function PrimaryBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: 'Space Grotesk',
        fontSize: '14px',
        fontWeight: 600,
        padding: '12px 18px',
        backgroundColor: 'var(--gold)',
        border: 'none',
        borderRadius: 'var(--radius-input)',
        color: '#0D0F1A',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        marginTop: '6px',
      }}
    >
      {children}
    </button>
  );
}
