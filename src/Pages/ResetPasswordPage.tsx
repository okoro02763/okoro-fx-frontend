import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthShell, { PrimaryButton } from '../components/AuthShell';
import Field, { inputStyle } from '../components/Field';
import { resetPassword } from '../api/auth';

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

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = computeStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      setSuccess(res.message || 'Your password has been reset.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reset password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-root">
      <AuthShell
        title="Set a new password"
        subtitle="Choose a strong password for your account"
        footer={
          <>
            Changed your mind?{' '}
            <Link
              to="/login"
              style={{
                fontFamily: 'Inter',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--gold)',
                textDecoration: 'none',
              }}
            >
              Back to sign in
            </Link>
          </>
        }
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '14px',
                color: 'var(--profit)',
                margin: 0,
              }}
            >
              {success}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <Field
              label="New password"
              hint="At least 8 characters with a mix of cases, numbers and symbols."
            >
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor:
                        i <= strength
                          ? strengthColor(strength)
                          : 'var(--border)',
                      transition: 'background-color 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </Field>
            <Field label="Confirm password">
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Resetting…' : 'Reset password'}
            </PrimaryButton>
          </form>
        )}
      </AuthShell>
    </div>
  );
}
