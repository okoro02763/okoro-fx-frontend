import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Field, { inputStyle } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/format';
import { describeError, isRetryableError } from '../api/client';
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

/** How long a single request may take before it is treated as failed. */
const REQUEST_TIMEOUT_MS = 15_000;
/** After this long without an answer, tell the user the server is waking up. */
const SLOW_HINT_AFTER_MS = 5_000;
/** Delay before the one automatic retry. */
const RETRY_DELAY_MS = 2_000;

type LoadPhase = 'loading' | 'ready' | 'error';

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
  const [submitting, setSubmitting] = useState(false);

  // Page-load state. Before, a failed request left the page on "Loading..."
  // forever; now it ends in a readable error with a Retry button.
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  // Lets the error handler know whether we already have something to show,
  // without adding `status` to the load callback's dependencies.
  const statusRef = useRef<AccountStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadAccount = useCallback(
    async (autoRetry: boolean) => {
      if (!token) return;

      // Cancel anything still in flight: only the latest request matters.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase('loading');
      setLoadError(null);

      // Render's free tier can take up to a minute to wake up. Say so
      // instead of showing a spinner that looks broken.
      const slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);

      try {
        const data = await fetchAccountStatus(
          token,
          controller.signal,
          autoRetry
        );
        if (controller.signal.aborted) return;
        statusRef.current = data;
        setStatus(data);
        setPhase('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError(describeError(err));
        // If we already have data, keep showing it and flag the problem
        // inline; a failed refresh must not blank the page.
        setPhase(statusRef.current ? 'ready' : 'error');
      } finally {
        clearTimeout(slowTimer);
        if (!controller.signal.aborted) setSlow(false);
      }
    },
    [token]
  );

  const loadWithdrawals = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const w = await getMyWithdrawals(token, { signal });
        setWithdrawals(w);
      } catch {
        // The withdrawal history is secondary: a failure here must not
        // stop the account page from rendering.
      }
    },
    [token]
  );

  useEffect(() => {
    loadAccount(true);
    const controller = new AbortController();
    loadWithdrawals(controller.signal);
    return () => {
      abortRef.current?.abort();
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSwitch = async (accountType: AccountType) => {
    if (!token) return;
    setError(null);
    setInfo(null);
    try {
      const s = await setAccountType(token, accountType);
      statusRef.current = s;
      setStatus(s);
      if (accountType === 'live' && !s.liveVerified) {
        setTab('overview');
        setInfo('Choose an identity document to verify your live account.');
      }
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
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
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
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
      loadAccount(true);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resetWithdrawForm = () => {
    setWdAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
  };

  // First load: a skeleton, not a dead "Loading..." line.
  if (phase === 'loading' && !status) {
    return (
      <DashboardLayout title="My Account">
        <AccountSkeleton slow={slow} />
      </DashboardLayout>
    );
  }

  // First load failed and there is nothing to show: an error card with a
  // Retry button, so the user is never stuck.
  if (phase === 'error' && !status) {
    return (
      <DashboardLayout title="My Account">
        <LoadErrorCard
          message={loadError}
          onRetry={() => loadAccount(true)}
        />
      </DashboardLayout>
    );
  }

  if (!status) return null;

  const fees = status.fees;
  // The wallet is denominated in naira; fall back to NGN if the API did not
  // say (older deployments do not send the field).
  const currency = status.currency || 'NGN';

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
        <StatCard
          label="Available Balance"
          value={formatCurrency(status.availableBalance, currency)}
        />
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

      {loadError && (
        <div
          style={{
            ...msgStyle('var(--loss)'),
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => loadAccount(true)}
            style={retryBtnStyle}
          >
            Retry
          </button>
        </div>
      )}
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
            <PrimaryBtn disabled={submitting} onClick={() => {}}>
              {submitting ? 'Preparing checkout…' : 'Continue to payment'}
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
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Jane Doe" style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }} required />
            </Field>
            <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--sub)' }}>
              A service charge of {fees.withdrawalPercent}% is deducted from your withdrawal.
              Minimum withdrawal: N{fees.minWithdrawal.toLocaleString()}.
            </p>
            <PrimaryBtn disabled={submitting} onClick={() => {}}>
              {submitting ? 'Submitting…' : 'Request withdrawal'}
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

/**
 * Fetch the account status, with one automatic retry.
 *
 * The retry is deliberately limited to failures a second attempt could fix
 * (timeout, transport error, 5xx) and delayed by two seconds, so a server
 * that is still booting gets a second chance without a 401 being retried
 * pointlessly.
 */
async function fetchAccountStatus(
  token: string,
  signal: AbortSignal,
  autoRetry: boolean
): Promise<AccountStatus> {
  try {
    return await getAccountStatus(token, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      signal,
    });
  } catch (err) {
    if (!autoRetry || signal.aborted || !isRetryableError(err)) {
      throw err;
    }
    await wait(RETRY_DELAY_MS);
    if (signal.aborted) throw err;
    return getAccountStatus(token, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      signal,
    });
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const retryBtnStyle: React.CSSProperties = {
  fontFamily: 'Space Grotesk',
  fontSize: '12px',
  fontWeight: 600,
  padding: '7px 16px',
  borderRadius: 'var(--radius-pill)',
  backgroundColor: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

/**
 * Placeholder shown while the account status is loading.
 *
 * It mirrors the shape of the real content so the page does not jump when
 * the data arrives.
 */
function AccountSkeleton({ slow }: { slow: boolean }) {
  return (
    <div role="status" aria-label="Loading your account">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse px-4 py-4 sm:px-5 sm:py-[18px]"
            style={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)',
            }}
          >
            <div
              style={{
                height: 10,
                width: '45%',
                backgroundColor: 'var(--panel2)',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                height: 22,
                width: '70%',
                marginTop: 14,
                backgroundColor: 'var(--panel2)',
                borderRadius: 4,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="animate-pulse p-4 sm:p-5"
        style={{
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
        }}
      >
        <div
          style={{
            height: 12,
            width: '30%',
            backgroundColor: 'var(--panel2)',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 12,
            width: '85%',
            marginTop: 16,
            backgroundColor: 'var(--panel2)',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            height: 12,
            width: '60%',
            marginTop: 10,
            backgroundColor: 'var(--panel2)',
            borderRadius: 4,
          }}
        />
      </div>
      {slow && <WakingUpNote />}
    </div>
  );
}

/**
 * Shown when the request is taking long: Render's free tier suspends idle
 * instances and the next request has to wake them up again, which can take
 * up to a minute.
 */
function WakingUpNote() {
  return (
    <p
      style={{
        fontFamily: 'Inter',
        fontSize: '12px',
        color: 'var(--sub)',
        textAlign: 'center',
        marginTop: '18px',
      }}
    >
      Waking up the server, this can take a moment…
    </p>
  );
}

/**
 * Shown when the account could not be loaded at all.
 *
 * The message is deliberately vague and friendly: no stack traces, no raw
 * error text, just something the user can act on.
 */
function LoadErrorCard({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <Card>
      <div role="alert" style={{ textAlign: 'center', padding: '30px 12px' }}>
        <h3
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 10px',
          }}
        >
          We couldn’t load your account
        </h3>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: 'var(--sub)',
            margin: '0 0 6px',
          }}
        >
          {message || 'Something went wrong while loading your account.'}
        </p>
        <p
          style={{
            fontFamily: 'Inter',
            fontSize: '12px',
            color: 'var(--faint)',
            margin: '0 0 20px',
          }}
        >
          If the server is starting up, this can take up to a minute.
        </p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            fontFamily: 'Space Grotesk',
            fontSize: '13px',
            fontWeight: 600,
            padding: '10px 22px',
            backgroundColor: 'var(--gold)',
            border: 'none',
            borderRadius: 'var(--radius-pill)',
            color: '#0D0F1A',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </Card>
  );
}

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
