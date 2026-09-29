import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Field, { inputStyle } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import {
  getAccountStatus,
  setAccountType,
  submitKyc,
  fundLiveAccount,
  createWithdrawal,
  getMyWithdrawals,
  type AccountStatus,
  type Withdrawal,
  type AccountType,
} from '../api/account';

const DOC_TYPES = [
  { value: 'nin', label: 'NIN' },
  { value: 'national_id', label: 'National ID' },
  { value: 'voters_card', label: "Voter's Card" },
  { value: 'other', label: 'Other' },
];

type Tab = 'overview' | 'fund' | 'withdraw';

export default function AccountPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<Tab>('overview');

  const [docType, setDocType] = useState('nin');
  const [docNumber, setDocNumber] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

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

  const handleKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !docFile) {
      setError('Please select a document image.');
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await submitKyc(token, docType, docNumber, docFile);
      setInfo(res.message);
      setDocNumber('');
      setDocFile(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit document.');
    } finally {
      setLoading(false);
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
      ? { ...baseTab, backgroundColor: 'var(--panel2)', color: 'var(--text)', borderColor: 'var(--border)' }
      : baseTab;

  return (
    <DashboardLayout title="My Account">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <StatCard label="Account Type" value={status.accountType.toUpperCase()} />
        <StatCard label="Available Balance" value={`N${status.availableBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
        <StatCard
          label="Verification"
          value={status.liveVerified ? 'Verified' : status.kycStatus}
        />
      </div>

      {error && (
        <div style={msgStyle('var(--loss)')}>{error}</div>
      )}
      {info && (
        <div style={msgStyle('var(--gold)')}>{info}</div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['overview', 'fund', 'withdraw'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => { setError(null); setInfo(null); setTab(t); }} style={tabStyle(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card title="Account & Verification">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {(['demo', 'live'] as AccountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSwitch(t)}
                style={{
                  fontFamily: 'Space Grotesk',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '11px 18px',
                  borderRadius: 'var(--radius-input)',
                  cursor: 'pointer',
                  backgroundColor: status.accountType === t ? 'var(--gold)' : 'var(--panel2)',
                  color: status.accountType === t ? '#0D0F1A' : 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                {t.toUpperCase()} account
              </button>
            ))}
          </div>

          {status.accountType === 'live' && !status.liveVerified && (
            <form onSubmit={handleKyc}>
              <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)', marginTop: 0 }}>
                To use a live account, verify your identity with one government-issued document.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                {DOC_TYPES.map((d) => (
                  <label
                    key={d.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      backgroundColor: docType === d.value ? 'var(--panel2)' : 'transparent',
                      fontFamily: 'Inter',
                      fontSize: '13px',
                      color: 'var(--text)',
                    }}
                  >
                    <input
                      type="radio"
                      name="docType"
                      value={d.value}
                      checked={docType === d.value}
                      onChange={() => setDocType(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <Field label="Document number">
                <input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. 12345678901"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
                  required
                />
              </Field>
              <Field label="Upload document image">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--text)' }}
                  required
                />
              </Field>
              <PrimaryBtn disabled={loading} onClick={() => {}}>
                {loading ? 'Submitting…' : 'Submit for verification'}
              </PrimaryBtn>
            </form>
          )}

          {status.liveVerified && (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--profit)' }}>
              Your identity is verified. You can use the live (real-money) account.
            </p>
          )}
          {!status.liveVerified && status.accountType === 'demo' && (
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>
              You are on the demo account. Switch to live, complete identity verification, then fund
              your wallet to begin real trading.
            </p>
          )}
        </Card>
      )}

      {tab === 'fund' && (
        <Card title="Fund Live Account">
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
        </Card>
      )}

      {tab === 'withdraw' && (
        <Card title="Withdraw Funds">
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

          {withdrawals.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h4 style={{ fontFamily: 'Space Grotesk', fontSize: '14px', color: 'var(--text)', margin: '0 0 12px' }}>
                Withdrawal history
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

const baseTab: React.CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'capitalize',
  padding: '10px 16px',
  borderRadius: 'var(--radius-pill)',
  backgroundColor: 'var(--panel)',
  color: 'var(--sub)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

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
