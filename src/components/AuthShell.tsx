import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(1200px 600px at 20% -10%, rgba(232,180,84,0.06), transparent), var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '28px',
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
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '0.02em',
            }}
          >
            {BRAND_NAME}
          </span>
        </div>

        <p
          style={{
            fontFamily: 'Inter',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--sub)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: '-20px 0 24px',
          }}
        >
          {BRAND_TAGLINE}
        </p>

        <div
          style={{
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '28px',
          }}
        >
          <h1
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '6px',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '13px',
                color: 'var(--sub)',
                margin: '0 0 20px',
              }}
            >
              {subtitle}
            </p>
          )}
          {children}
        </div>

        <p
          style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: 'var(--sub)',
            textAlign: 'center',
            marginTop: '20px',
          }}
        >
          {footer}
        </p>
      </div>
    </div>
  );
}

export function AuthLink({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const base = {
    family: 'Inter',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--gold)',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  } as const;

  if (onClick) {
    return (
      <button type="button" style={base} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <Link to={to} style={base}>
      {children}
    </Link>
  );
}

interface PrimaryButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function PrimaryButton({
  children,
  disabled,
  style,
}: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'var(--gold)',
        border: 'none',
        borderRadius: 'var(--radius-input)',
        color: '#0D0F1A',
        fontFamily: 'Space Grotesk',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
