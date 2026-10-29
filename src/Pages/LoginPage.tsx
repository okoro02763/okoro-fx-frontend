import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthShell, {
  AuthLink,
  PrimaryButton,
} from '../components/AuthShell';
import Field, { inputStyle } from '../components/Field';
import { login as apiLogin, passkeyLoginBegin, passkeyLoginFinish } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../brand';
import { authenticatePasskey, isWebAuthnSupported } from '../lib/webauthn';

const LIVE_PAIRS = [
  { pair: 'EUR/USD', bid: 1.08412, ask: 1.08418, chg: 0.12 },
  { pair: 'GBP/USD', bid: 1.27045, ask: 1.27052, chg: -0.08 },
  { pair: 'USD/JPY', bid: 151.302, ask: 151.311, chg: 0.43 },
  { pair: 'AUD/USD', bid: 0.65421, ask: 0.65427, chg: 0.02 },
  { pair: 'USD/CAD', bid: 1.36012, ask: 1.36019, chg: -0.21 },
  { pair: 'NZD/USD', bid: 0.60488, ask: 0.60494, chg: 0.33 },
  { pair: 'EUR/GBP', bid: 0.85341, ask: 0.85348, chg: -0.05 },
  { pair: 'USD/CHF', bid: 0.90234, ask: 0.90241, chg: 0.18 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)
    ?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      login(res.token, res.user);
      navigate(from || '/', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Sign in failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (!isWebAuthnSupported()) {
      setError('Passkeys are not supported on this browser/device.');
      return;
    }
    setError(null);
    setPasskeyLoading(true);
    try {
      const options = await passkeyLoginBegin(email || undefined);
      const credential = await authenticatePasskey(options);
      const res = await passkeyLoginFinish(credential);
      login(res.token, res.user);
      navigate(from || '/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Passkey sign in failed.';
      setError(msg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="fp-root box-border w-full overflow-x-hidden">
      <div className="flex min-h-screen w-full flex-col bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(232,180,84,0.06),transparent)] md:flex-row">
        {/* Live pairs ticker sidebar */}
        <aside className="order-2 box-border hidden w-full shrink-0 flex-col gap-3.5 self-stretch border-t border-[#272C47] p-6 sm:flex md:order-1 md:w-[360px] md:border-r md:border-t-0">
          <div className="mb-2 flex items-center gap-2.5">
            <img
              src="/OKORO%20FX%20Trading%20Brand%20Identity.png"
              alt={BRAND_NAME}
              className="block h-9 w-auto"
            />
          </div>
          <p className="mb-1.5 mt-1.5 text-xs font-medium text-[#868CA8]">
            LIVE MARKETS
          </p>
          {LIVE_PAIRS.map((p) => (
            <div
              key={p.pair}
              className="box-border flex items-center justify-between gap-3 rounded-[10px] border border-[#272C47] bg-[#151829] px-3.5 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-sm font-semibold text-[#EDEEF5]">
                  {p.pair}
                </span>
                <span
                  data-mono
                  className="whitespace-nowrap font-mono text-sm text-[#868CA8]"
                >
                  {p.bid} / {p.ask}
                </span>
              </div>
              <span
                data-mono
                className="whitespace-nowrap font-mono text-sm font-medium"
                style={{ color: p.chg >= 0 ? 'var(--profit)' : 'var(--loss)' }}
              >
                {p.chg >= 0 ? '+' : ''}
                {p.chg.toFixed(2)}%
              </span>
            </div>
          ))}
        </aside>

        {/* Sign in form */}
        <AuthShell
          title="Welcome back"
          subtitle={`Sign in to your ${BRAND_NAME} account`}
          footer={
            <>
              Don't have an account? <AuthLink to="/signup">Create one</AuthLink>
              {' · '}
              <AuthLink to="/forgot-password">Forgot password?</AuthLink>
            </>
          }
        >
          {!verificationRequired ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </Field>
              {error && (
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    color: 'var(--loss)',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}
              <PrimaryButton disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </PrimaryButton>
              {isWebAuthnSupported() && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#272C47' }} />
                    <span style={{ fontSize: '12px', color: '#868CA8' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: '#272C47' }} />
                  </div>
                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #272C47',
                      background: '#151829',
                      color: '#EDEEF5',
                      fontFamily: 'Inter',
                      fontSize: '14px',
                      cursor: passkeyLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
                    </svg>
                    {passkeyLoading ? 'Signing in with passkey…' : 'Sign in with Passkey / Fingerprint'}
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontFamily: 'Inter', fontSize: '12px', color: '#868CA8', margin: 0 }}>
                We sent a 6-digit verification code to {email}. Enter it to trust this device.
              </p>
              <Field label="Verification code">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '18px' }}
                />
              </Field>
              {error && (
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    color: 'var(--loss)',
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}
              <PrimaryButton disabled={loading || code.length < 6}>
                {loading ? 'Verifying…' : 'Verify device'}
              </PrimaryButton>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                style={{ background: 'none', border: 'none', color: '#E8B454', fontSize: '12px', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer' }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => { setVerificationRequired(false); setCode(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#868CA8', fontSize: '12px', cursor: 'pointer' }}
              >
                Back to login
              </button>
            </form>
          )}
        </AuthShell>
      </div>
    </div>
  );
}
