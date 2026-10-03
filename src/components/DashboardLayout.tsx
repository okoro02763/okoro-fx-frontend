import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkStyle: React.CSSProperties = {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--sub)',
    textDecoration: 'none',
  };

  return (
    <div
      className="fp-root"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--panel)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '11px',
              height: '11px',
              borderRadius: '4px',
              backgroundColor: 'var(--gold)',
              transform: 'rotate(45deg)',
            }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span
              style={{
                fontFamily: 'Space Grotesk',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              {BRAND_NAME}
            </span>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--sub)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {BRAND_TAGLINE}
            </span>
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <Link to="/" style={navLinkStyle}>
            Dashboard
          </Link>
          <Link to="/settings/strategy" style={navLinkStyle}>
            Strategy
          </Link>
          <Link to="/analytics" style={navLinkStyle}>
            Analytics
          </Link>
          <Link to="/referrals" style={navLinkStyle}>
            Referrals
          </Link>
          <Link to="/account" style={navLinkStyle}>
            Account
          </Link>
          {isAdmin && (
            <>
              <Link to="/admin" style={navLinkStyle}>
                Admin
              </Link>
              <Link to="/fraud" style={navLinkStyle}>
                Fraud
              </Link>
            </>
          )}
          <span style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--sub)' }}>
            {user?.name || user?.email || ''}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              fontFamily: 'Inter',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--loss)',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-input)',
              padding: '7px 14px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
        {title && (
          <h1
            style={{
              fontFamily: 'Space Grotesk',
              fontSize: '22px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '20px',
            }}
          >
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}
