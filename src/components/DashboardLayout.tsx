import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../brand';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function initials(nameOrEmail: string | undefined): string {
  const raw = (nameOrEmail || '').trim();
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

export default function DashboardLayout({
  children,
  title,
}: DashboardLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Close the avatar menu on any outside click or Escape press.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const navLinkStyle: React.CSSProperties = {
    fontFamily: 'Inter',
    fontWeight: 500,
    color: 'var(--sub)',
    textDecoration: 'none',
  };

  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    fontFamily: 'Inter',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
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

          {/* Profile avatar menu -- replaces the old plain-text user name
              and keeps Account/Referrals/Sign out one tap away. */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Open account menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold select-none"
              style={{
                fontFamily: 'Space Grotesk',
                backgroundColor: 'var(--gold)',
                color: '#0D0F1A',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {initials(user?.name || user?.email)}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden"
                style={{
                  backgroundColor: 'var(--panel2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-input)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div
                    className="truncate text-[13px] font-semibold"
                    style={{ fontFamily: 'Inter', color: 'var(--text)' }}
                  >
                    {user?.name || user?.email || ''}
                  </div>
                  {user?.name && (
                    <div
                      className="truncate text-[12px]"
                      style={{ fontFamily: 'Inter', color: 'var(--sub)' }}
                    >
                      {user.email}
                    </div>
                  )}
                </div>
                <Link
                  to="/account"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--panel)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  Account &amp; verification
                </Link>
                <Link
                  to="/referrals"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={menuItemStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--panel)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  Referrals
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  style={{ ...menuItemStyle, color: 'var(--loss)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--panel)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
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
