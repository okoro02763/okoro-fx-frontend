import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthShell, {
  AuthLink,
  PrimaryButton,
} from '../components/AuthShell';
import Field, { inputStyle } from '../components/Field';
import { login as apiLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';

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

  return (
    <div className="fp-root box-border w-full overflow-x-hidden">
      <div className="flex min-h-screen w-full flex-col bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(232,180,84,0.06),transparent)] md:flex-row">
        {/* Live pairs ticker sidebar */}
        <aside className="order-2 box-border hidden w-full shrink-0 flex-col gap-3.5 self-stretch border-t border-[#272C47] p-6 sm:flex md:order-1 md:w-[360px] md:border-r md:border-t-0">
          <div className="mb-2 flex items-center gap-2.5">
            <span
              className="h-3 w-3 rotate-45 rounded-[4px] bg-[#E8B454]"
              aria-hidden="true"
            />
            <span className="font-display text-xl font-bold text-[#EDEEF5]">
              {BRAND_NAME}
            </span>
          </div>
          <p className="m-0 text-[11px] font-medium uppercase tracking-[0.06em] text-[#868CA8]">
            {BRAND_TAGLINE}
          </p>
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
          </form>
        </AuthShell>
      </div>
    </div>
  );
}
