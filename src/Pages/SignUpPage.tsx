import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell, { AuthLink, PrimaryButton } from '../components/AuthShell';
import Field, { inputStyle } from '../components/Field';
import { signup, validateReferral } from '../api/auth';
import { useAuth } from '../context/AuthContext';

function strengthColor(score: number) {
  if (score <= 1) return 'var(--loss)';
  if (score <= 2) return 'var(--gold)';
  return 'var(--profit)';
}

function computeStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return score;
}

export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState<string>(
    () => searchParams.get('ref') || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralStatus, setReferralStatus] = useState<
    'idle' | 'checking' | 'valid' | 'invalid'
  >('idle');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const strength = computeStrength(password);

  const checkReferral = async (): Promise<boolean> => {
    const code = referralCode.trim();
    if (!code) {
      setReferralStatus('idle');
      setReferrerName(null);
      return true;
    }
    setReferralStatus('checking');
    try {
      const res = await validateReferral(code);
      setReferralStatus(res.valid ? 'valid' : 'invalid');
      setReferrerName(res.valid ? res.referrer || null : null);
      return res.valid;
    } catch {
      // Network error: don't block, the server re-validates on submit.
      setReferralStatus('idle');
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (!(await checkReferral())) {
        setError('Invalid referral code.');
        return;
      }
      const res = await signup(
        name,
        email,
        password,
        referralCode.trim() || undefined
      );
      if (res.token && res.user) {
        login(res.token, res.user);
        navigate('/', { replace: true });
      } else if (res.message) {
        setInfo(res.message);
      } else {
        setInfo(
          'Account created. Please check your email to verify before signing in.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Sign up failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-root">
      <AuthShell
        title="Create your account"
        subtitle="Start automating your forex trading"
        footer={
          <>
            Already have an account? <AuthLink to="/login">Sign in</AuthLink>
          </>
        }
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <Field label="Name">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              style={inputStyle}
            />
          </Field>
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
          <Field label="Referral code" hint="Optional — if you were invited, enter the code here.">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase());
                setReferralStatus('idle');
                setReferrerName(null);
              }}
              onBlur={() => {
                void checkReferral();
              }}
              placeholder="e.g. ABCD1234"
              style={{ ...inputStyle, fontFamily: 'JetBrains Mono' }}
            />
            {referralStatus === 'checking' && (
              <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
                Checking code…
              </p>
            )}
            {referralStatus === 'valid' && (
              <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--profit)', margin: '4px 0 0' }}>
                Valid code{referrerName ? ` — invited by ${referrerName}` : ''}.
              </p>
            )}
            {referralStatus === 'invalid' && (
              <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--loss)', margin: '4px 0 0' }}>
                Invalid referral code.
              </p>
            )}
          </Field>
          <Field label="Password" hint="At least 8 characters with a mix of cases, numbers and symbols.">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginTop: '8px',
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor:
                      i <= strength ? strengthColor(strength) : 'var(--border)',
                    transition: 'background-color 0.2s ease',
                  }}
                />
              ))}
            </div>
          </Field>
          {error && (
            <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--loss)', margin: 0 }}>
              {error}
            </p>
          )}
          {info && (
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                color: 'var(--profit)',
                margin: 0,
              }}
            >
              {info}
            </p>
          )}
          <PrimaryButton disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </PrimaryButton>
        </form>
      </AuthShell>
    </div>
  );
}
