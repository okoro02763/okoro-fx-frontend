import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../brand';

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
        className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between md:px-7 md:py-[18px]"
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--panel)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/OKORO%20FX%20Trading%20Brand%20Identity.png"
            alt={BRAND_NAME}
            className="block h-9 w-auto md:h-10"
          />
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end md:gap-5">
          <Link to="/" className="text-[13px] md:text-sm" style={navLinkStyle}>
            Dashboard
          </Link>
          <Link
            to="/terminal"
            className="text-[13px] md:text-sm"
            style={navLinkStyle}
          >
            Terminal
          </Link>
          <Link
            to="/settings/strategy"
            className="text-[13px] md:text-sm"
            style={navLinkStyle}
          >
            Strategy
          </Link>
          <Link
            to="/analytics"
            className="text-[13px] md:text-sm"
            style={navLinkStyle}
          >
            Analytics
          </Link>
          <Link
            to="/referrals"
            className="text-[13px] md:text-sm"
            style={navLinkStyle}
          >
            Referrals
          </Link>
          <Link
            to="/account"
            className="text-[13px] md:text-sm"
            style={navLinkStyle}
          >
            Account
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className="text-[13px] md:text-sm"
                style={navLinkStyle}
              >
                Admin
              </Link>
              <Link
                to="/fraud"
                className="text-[13px] md:text-sm"
                style={navLinkStyle}
              >
                Fraud
              </Link>
            </>
          )}
          <span
            className="text-[13px] break-all"
            style={{ fontFamily: 'Inter', color: 'var(--sub)' }}
          >
            {user?.name || user?.email || ''}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-[13px]"
            style={{
              fontFamily: 'Inter',
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

      <main className="mx-auto w-full max-w-[1200px] px-4 py-5 md:px-7 md:py-7">
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
