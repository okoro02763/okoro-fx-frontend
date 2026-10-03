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
    <div className="fp-root">
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 360px) 1fr',
          background:
            'radial-gradient(1200px 600px at 20% -10%, rgba(232,180,84,0.06), transparent), var(--bg)',
        }}
      >
        {/* Live pairs ticker sidebar */}
        <aside
          style={{
            borderRight: '1px solid var(--border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            alignSelf: 'stretch',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '4px',
                backgroundColor: 'var(--gold)',
                transform: 'rotate(45deg)',
              }}
            />
            <span
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {BRAND_NAME}
            </span>
          </div>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--sub)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: '6px 0 0',
            }}
          >
            {BRAND_TAGLINE}
          </p>
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--sub)',
              margin: '0 0 6px',
            }}
          >
            LIVE MARKETS
          </p>
          {LIVE_PAIRS.map((p) => (
            <div
              key={p.pair}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-input)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontFamily: 'Space Grotesk',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {p.pair}
                </span>
                <span
                  data-mono
                  style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '13px',
                    color: 'var(--sub)',
                  }}
                >
                  {p.bid} / {p.ask}
                </span>
              </div>
              <span
                data-mono
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: p.chg >= 0 ? 'var(--profit)' : 'var(--loss)',
                }}
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
