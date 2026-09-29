import React, { useState } from 'react';
import AuthShell, { AuthLink, PrimaryButton } from '../components/AuthShell';
import Field, { inputStyle } from '../components/Field';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSent(res.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send reset link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-root">
      <AuthShell
        title="Reset your password"
        subtitle="Enter your email and we'll send you a reset link"
        footer={
          <>
            Remembered it? <AuthLink to="/login">Back to sign in</AuthLink>
          </>
        }
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: 'rgba(56,217,169,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'var(--profit)', fontSize: '18px' }}>✓</span>
            </div>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                color: 'var(--text)',
                margin: '0 0 8px',
              }}
            >
              Check your email
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                color: 'var(--sub)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {sent}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
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
              {loading ? 'Sending…' : 'Send reset link'}
            </PrimaryButton>
          </form>
        )}
      </AuthShell>
    </div>
  );
}
